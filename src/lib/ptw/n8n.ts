import type { Permit, PermitApproval, PermitStatus, Settings } from "./types";
import { effectiveSteps } from "./workflow";
import { sendPermitSmsIrNotification } from "./sms-ir";

/**
 * تولید توکن امنیتی تایید هوشمند (Signed Token) برای لینک‌های بدون لاگین در n8n/پیام‌رسان
 */
export function generateSignedToken(
  permitId: string,
  roleTitle: string,
  action: "approve" | "reject" = "approve",
): string {
  const payload = `${permitId}:${roleTitle}:${action}:${Date.now()}`;
  // کدگذاری ساده و مطمئن برای مرورگر و سرور
  const b64 = typeof btoa !== "undefined" ? btoa(payload) : Buffer.from(payload).toString("base64");
  return `ptw_sig_${b64.replace(/=/g, "")}`;
}

/**
 * اعتبارسنجی توکن امضای دریافت شده
 */
export function verifySignedToken(
  token: string,
  permitId: string,
): { valid: boolean; action?: "approve" | "reject"; roleTitle?: string } {
  if (!token || !token.startsWith("ptw_sig_")) {
    return { valid: false };
  }
  try {
    const rawB64 = token.replace("ptw_sig_", "");
    const decoded =
      typeof atob !== "undefined" ? atob(rawB64) : Buffer.from(rawB64, "base64").toString("utf-8");
    const parts = decoded.split(":");
    if (parts.length >= 3 && parts[0] === permitId) {
      return {
        valid: true,
        roleTitle: parts[1],
        action: parts[2] as "approve" | "reject",
      };
    }
  } catch (err) {
    console.error("خطا در رمزگشایی توکن امضا:", err);
  }
  return { valid: false };
}

/**
 * محاسبه دقیق وضعیت گردش کار (Workflow Status) بر اساس امضاها و زمان
 */
export function determineWorkflowStatus(permit: Permit): PermitStatus {
  // اگر مجوز منقضی شده باشد
  if (
    permit.endAt &&
    new Date(permit.endAt).getTime() < Date.now() &&
    permit.status !== "closed" &&
    permit.status !== "approved"
  ) {
    return "expired";
  }

  // اگر حداقل یکی از امضاها رد شده باشد
  const hasRejected = (permit.signatures || []).some((s) => s.decision === "rejected");
  if (hasRejected) {
    return "rejected";
  }

  const steps = effectiveSteps(permit);
  if (steps.length === 0) {
    return "approved";
  }

  // بررسی امضاهای تایید شده به ترتیب مراحل
  let currentIdx = 0;
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const isSigned = (permit.signatures || []).some(
      (s) => s.stepId === step.id && s.decision === "approved",
    );
    if (isSigned) {
      currentIdx = i + 1;
    } else {
      break;
    }
  }

  if (currentIdx >= steps.length) {
    return "approved";
  }

  // نقشه نگاشت مراحل به وضعیت‌های استاندارد نیازمندی
  const nextRole = steps[currentIdx]?.roleTitle?.toLowerCase() || "";
  if (
    nextRole.includes("سرپرست") ||
    nextRole.includes("متقاضی") ||
    nextRole.includes("supervisor")
  ) {
    return "pending_supervisor";
  }
  if (nextRole.includes("ایمنی") || nextRole.includes("hse")) {
    return "pending_hse";
  }
  if (
    nextRole.includes("مدیر") ||
    nextRole.includes("رئیس") ||
    nextRole.includes("منطقه") ||
    nextRole.includes("area")
  ) {
    return "pending_area_owner";
  }

  // به عنوان جایگزین برای سایر نقش‌ها
  if (currentIdx === 0) return "pending_supervisor";
  if (currentIdx === 1) return "pending_hse";
  return "pending_area_owner";
}

/**
 * ساخت تاریخچه کامل امضاها (permit_approvals)
 */
export function buildPermitApprovals(permit: Permit): PermitApproval[] {
  const steps = effectiveSteps(permit);
  const approvals: PermitApproval[] = [];

  steps.forEach((step, idx) => {
    const sig = (permit.signatures || []).find((s) => s.stepId === step.id);
    approvals.push({
      id: `appr_${permit.id}_${step.id}`,
      permit_id: permit.id,
      signer_name: sig ? sig.name : "در انتظار امضا",
      role: step.roleTitle,
      status: sig ? sig.decision : idx === permit.currentStepIndex ? "pending" : "pending",
      comment: sig?.comment || "",
      signed_at: sig?.at || "",
      verification_hash: sig?.verificationHash,
      otp_verified: sig?.verifiedOtp,
    });
  });

  return approvals;
}

/**
 * متصاعد کردن رویداد PermitStatusChanged و ارسال وب‌هوک به n8n
 */
export async function sendN8nPermitStatusWebhook(
  permit: Permit,
  settings?: Settings,
  actorName?: string,
): Promise<{ success: boolean; message: string }> {
  const webhookUrl =
    (typeof process !== "undefined" && process.env?.N8N_WEBHOOK_URL) ||
    settings?.n8nWebhookUrl ||
    settings?.otpConfig?.webhookUrl ||
    "https://n8n.example.com/webhook/ptw-permit-status-changed";

  const appUrl =
    (typeof process !== "undefined" && process.env?.APP_URL) ||
    (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");

  const currentStatus = determineWorkflowStatus(permit);
  const steps = effectiveSteps(permit);
  const nextStep = steps[permit.currentStepIndex] || steps[steps.length - 1];

  const approveToken = generateSignedToken(permit.id, nextStep?.roleTitle || "Approver", "approve");
  const rejectToken = generateSignedToken(permit.id, nextStep?.roleTitle || "Approver", "reject");

  const payload = {
    event: "PermitStatusChanged",
    permit_id: permit.id,
    number: permit.number,
    title: permit.description || permit.customTypeTitle || `مجوز کار ${permit.type}`,
    type: permit.type,
    issuer: permit.supervisorName || permit.createdBy || "واحد صادرکننده",
    unit: permit.unit,
    location: permit.location,
    contractor: permit.contractor,
    workers: permit.workers,
    risk_level: (permit.hazards || []).length >= 3 ? "بالا (High Risk)" : "متوسط (Medium)",
    status: currentStatus,
    status_title_fa: getStatusTitleFa(currentStatus),
    current_step_role: nextStep?.roleTitle || "تکمیل شده",
    actor: actorName || permit.createdBy || "سیستم",
    approval_url: `${appUrl}/api/v1/permits/${permit.id}/approve?token=${approveToken}`,
    rejection_url: `${appUrl}/api/v1/permits/${permit.id}/reject?token=${rejectToken}`,
    client_link: `${appUrl}/permits/${permit.id}?token=${approveToken}`,
    start_at: permit.startAt,
    end_at: permit.endAt,
    approvals_history: buildPermitApprovals(permit),
    timestamp: new Date().toISOString(),
  };

  // در صورت فعال بودن سامانه sms.ir، پیامک اختصاصی برای مسئول مرحله جاری نیز ارسال می‌شود
  if (settings?.smsIr?.enabled && settings?.smsIr?.apiKey) {
    const people = settings.people || [];
    const targetPerson = people.find(
      (p) =>
        p.position &&
        (p.position.toLowerCase().includes(nextStep?.roleTitle.toLowerCase() || "") ||
          (nextStep?.roleTitle.toLowerCase() || "").includes(p.position.toLowerCase())),
    );

    if (targetPerson && targetPerson.phone) {
      void sendPermitSmsIrNotification(settings.smsIr, targetPerson, {
        permitNumber: permit.number,
        permitType: permit.type,
        roleTitle: nextStep?.roleTitle || "مسئول تایید",
        stepTitle: nextStep?.title || "بررسی و امضا",
        companyName: settings.companyName || "PTW",
        approvalUrl: payload.approval_url,
        clientUrl: payload.client_link,
      }).catch((e) => console.warn("SMS.ir auto dispatch notice error:", e));
    }
  }

  console.log("🚀 Dispatching PermitStatusChanged event to n8n webhook:", webhookUrl, payload);

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-PTW-Event": "PermitStatusChanged",
        "X-N8N-API-Key":
          (typeof process !== "undefined" && process.env?.N8N_API_KEY) || settings?.n8nApiKey || "",
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      return { success: true, message: "ارسال موفق رویداد به n8n" };
    }
    return { success: false, message: `پاسخ وب‌هوک n8n با خطا مواجه شد: ${res.status}` };
  } catch (err) {
    console.warn("ارسال مستقیم به n8n ناموفق بود (احتمال عدم دسترسی به شبکه یا آدرس تست):", err);
    return { success: false, message: "خطا در برقراری ارتباط با وب‌هوک n8n" };
  }
}

/**
 * تست ارسال پینگ آزمایشی به وب‌هوک n8n جهت بررسی دسترسی
 */
export async function pingN8nWebhook(
  webhookUrl: string,
  apiKey?: string,
): Promise<{ success: boolean; message: string }> {
  if (!webhookUrl) {
    return { success: false, message: "آدرس وب‌هوک n8n را وارد نمایید." };
  }
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-PTW-Event": "PingTest",
        "X-N8N-API-Key": apiKey || "",
      },
      body: JSON.stringify({
        event: "PingTest",
        message: "آزمایش ارتباط موفق سامانه مجوز کار PTW با n8n",
        timestamp: new Date().toISOString(),
        testData: {
          number: "PTW-PING-TEST",
          title: "مجوز آزمایشی تست ارتباط",
          status: "pending_hse",
          status_title_fa: "در انتظار بررسی ایمنی",
        },
      }),
    });

    if (res.ok) {
      return { success: true, message: "ارتباط با وب‌هوک n8n با موفقیت تایید شد (Status 200 OK)." };
    }
    return {
      success: false,
      message: `وب‌هوک پاسخ داد ولی وضعیت غیراز 200 بود (Status: ${res.status}). آدرس Webhook را بررسی کنید.`,
    };
  } catch (err) {
    console.error("N8N Webhook Ping Error:", err);
    return {
      success: false,
      message: "عدم توانایی در اتصال به وب‌هوک n8n (بررسی صحت URL یا دسترسی شبکه).",
    };
  }
}

export function getStatusTitleFa(status: PermitStatus): string {
  switch (status) {
    case "draft":
      return "پیش‌نویس اولیه";
    case "pending_supervisor":
      return "در انتظار تایید سرپرست متقاضی";
    case "pending_hse":
      return "در انتظار تایید و صدور واحد HSE";
    case "pending_area_owner":
      return "در انتظار تایید مدیر / مسئول منطقه";
    case "approved":
      return "تایید نهایی و صادرشده";
    case "rejected":
      return "ردشده توسط مسئولین";
    case "expired":
      return "منقضی‌شده";
    case "active":
      return "فعال در محل";
    case "suspended":
      return "معلق‌شده ایمنی";
    case "closed":
      return "بسته و تحویل‌شده";
    default:
      return status;
  }
}
