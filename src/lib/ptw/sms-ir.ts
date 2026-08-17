import type { SmsIrConfig, Person } from "./types";

export interface SmsIrResponse {
  status: number;
  message: string;
  data?: unknown;
}

export interface SmsIrVerifyParam {
  name: string;
  value: string;
}

/**
 * ارسال پیامک بر اساس الگوی سریع (Fast Pattern / Verify) در سامانه sms.ir
 * Endpoint: POST https://api.sms.ir/v1/send/verify
 */
export async function sendSmsIrVerify(
  config: SmsIrConfig,
  mobile: string,
  parameters: SmsIrVerifyParam[],
): Promise<{ success: boolean; message: string; data?: unknown }> {
  if (!config.apiKey) {
    return { success: false, message: "کلید API سامانه sms.ir وارد نشده است." };
  }
  if (!config.templateId) {
    return { success: false, message: "شناسه قالب (Template ID) سامانه sms.ir مشخص نشده است." };
  }

  const cleanMobile = normalizeIranianMobile(mobile);
  if (!cleanMobile) {
    return { success: false, message: "شماره موبایل گیرنده معتبر نیست." };
  }

  const payload = {
    mobile: cleanMobile,
    templateId: Number(config.templateId) || config.templateId,
    parameters: parameters.map((p) => ({
      name: p.name.trim(),
      value: String(p.value).trim(),
    })),
  };

  try {
    const res = await fetch("https://api.sms.ir/v1/send/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/plain",
        "x-api-key": config.apiKey.trim(),
      },
      body: JSON.stringify(payload),
    });

    const json = (await res.json()) as SmsIrResponse;
    if (res.ok && (json.status === 1 || json.status === 200 || json.status === 0)) {
      return {
        success: true,
        message: "پیامک با موفقیت از طریق الگوی sms.ir ارسال شد.",
        data: json.data,
      };
    }

    return {
      success: false,
      message: json.message || `خطا در ارسال پیامک با کد وضعیت ${res.status}`,
      data: json,
    };
  } catch (err) {
    console.error("SMS.ir Verify API Error:", err);
    return {
      success: false,
      message: "خطا در ارتباط با سرور sms.ir (بررسی اتصال اینترنت یا کلید API)",
    };
  }
}

/**
 * ارسال پیامک مستقیم متنی (Bulk/Live) در سامانه sms.ir
 * Endpoint: POST https://api.sms.ir/v1/send/bulk
 */
export async function sendSmsIrBulk(
  config: SmsIrConfig,
  mobile: string,
  messageText: string,
): Promise<{ success: boolean; message: string; data?: unknown }> {
  if (!config.apiKey) {
    return { success: false, message: "کلید API سامانه sms.ir وارد نشده است." };
  }

  const cleanMobile = normalizeIranianMobile(mobile);
  if (!cleanMobile) {
    return { success: false, message: "شماره موبایل گیرنده معتبر نیست." };
  }

  const payload = {
    lineNumber: config.lineNumber ? Number(config.lineNumber) : 30007732,
    messageText: messageText.trim(),
    mobiles: [cleanMobile],
  };

  try {
    const res = await fetch("https://api.sms.ir/v1/send/bulk", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/plain",
        "x-api-key": config.apiKey.trim(),
      },
      body: JSON.stringify(payload),
    });

    const json = (await res.json()) as SmsIrResponse;
    if (res.ok && (json.status === 1 || json.status === 200 || json.status === 0)) {
      return {
        success: true,
        message: "پیامک متنی با موفقیت از طریق سامانه sms.ir ارسال شد.",
        data: json.data,
      };
    }

    return {
      success: false,
      message: json.message || `خطا در ارسال پیامک متنی: ${res.status}`,
      data: json,
    };
  } catch (err) {
    console.error("SMS.ir Bulk API Error:", err);
    return {
      success: false,
      message: "خطا در ارتباط با سرور پیامک sms.ir",
    };
  }
}

/**
 * ارسال اعلان تغییر وضعیت یا نوبت امضای مجوز به مسئول مربوطه از طریق sms.ir
 */
export async function sendPermitSmsIrNotification(
  config: SmsIrConfig,
  recipient: Person | { name: string; phone?: string; position?: string },
  data: {
    permitNumber: string;
    permitType: string;
    roleTitle: string;
    stepTitle: string;
    companyName: string;
    approvalUrl?: string;
    clientUrl?: string;
  },
): Promise<{ success: boolean; message: string }> {
  if (!config.enabled || !config.apiKey) {
    return { success: false, message: "سامانه sms.ir غیرفعال است یا کلید API تنظیم نشده است." };
  }

  const phone = recipient.phone || "";
  if (!phone) {
    return { success: false, message: `شماره تلفن برای مسئول «${recipient.name}» یافت نشد.` };
  }

  if (config.sendMode === "verify_pattern" && config.templateId) {
    const paramNameSigner = config.parameterNameSigner || "NAME";
    const paramNamePermit = config.parameterNamePermit || "NUMBER";
    const paramNameRole = config.parameterNameRole || "ROLE";
    const paramNameLink = config.parameterNameLink || "LINK";

    const params: SmsIrVerifyParam[] = [
      { name: paramNameSigner, value: recipient.name || "مسئول محترم" },
      { name: paramNamePermit, value: data.permitNumber },
      { name: paramNameRole, value: data.roleTitle || data.stepTitle },
      { name: paramNameLink, value: data.approvalUrl || data.clientUrl || "سامانه PTW" },
    ];

    return sendSmsIrVerify(config, phone, params);
  }

  // ارسال متنی استاندارد
  const text = `سامانه مجوز کار ${data.companyName}\nهمکار گرامی ${recipient.name}\nمجوز شماره ${data.permitNumber} (${data.permitType}) در مرحله «${data.stepTitle}» نیازمند بررسی و امضای شماست.\nلینک مشاهده و تایید:\n${data.approvalUrl || data.clientUrl || ""}`;
  return sendSmsIrBulk(config, phone, text);
}

/**
 * ارسال کد احراز هویت OTP امضا با سامانه sms.ir
 */
export async function sendOtpSmsIr(
  config: SmsIrConfig,
  recipient: Person,
  code: string,
  stepTitle: string,
): Promise<{ success: boolean; message: string }> {
  if (!config.enabled || !config.apiKey) {
    return { success: false, message: "ارسال پیامک فعال نیست." };
  }

  const phone = recipient.phone || "";
  if (!phone) {
    return { success: false, message: "شماره تلفن همراه یافت نشد." };
  }

  if (config.sendMode === "verify_pattern" && config.templateId) {
    const paramNameOtp = config.parameterNameOtp || "CODE";
    const paramNameSigner = config.parameterNameSigner || "NAME";

    const params: SmsIrVerifyParam[] = [
      { name: paramNameOtp, value: code },
      { name: paramNameSigner, value: recipient.name || "همکار گرامی" },
    ];

    return sendSmsIrVerify(config, phone, params);
  }

  const text = `کد تایید امضای دیجیتال مجوز کار (PTW)\nنام: ${recipient.name}\nکد احراز هویت: ${code}\nمرحله: ${stepTitle}\n(اعتبار ۲ دقیقه)`;
  return sendSmsIrBulk(config, phone, text);
}

/**
 * تست آنلاین اتصال و ارسال پیامک آزمایشی به شماره دلخواه
 */
export async function testSmsIrConnection(
  config: SmsIrConfig,
  testMobile: string,
): Promise<{ success: boolean; message: string; details?: unknown }> {
  if (!config.apiKey) {
    return { success: false, message: "لطفاً ابتدا کلید API سامانه sms.ir را وارد کنید." };
  }
  const cleanMobile = normalizeIranianMobile(testMobile);
  if (!cleanMobile) {
    return { success: false, message: "شماره موبایل تست نامعتبر است (مثال: 09121234567)." };
  }

  if (config.sendMode === "verify_pattern") {
    if (!config.templateId) {
      return {
        success: false,
        message: "برای حالت الگوی سریع، شناسه قالب (Template ID) الزامی است.",
      };
    }
    const testParams: SmsIrVerifyParam[] = [
      { name: config.parameterNameSigner || "NAME", value: "کاربر تست سامانه" },
      { name: config.parameterNameOtp || "CODE", value: "543210" },
      { name: config.parameterNamePermit || "NUMBER", value: "PTW-TEST-1405" },
      { name: config.parameterNameRole || "ROLE", value: "مسئول ایمنی HSE" },
      { name: config.parameterNameLink || "LINK", value: "https://ptw.example.com" },
    ];

    const res = await sendSmsIrVerify(config, cleanMobile, testParams);
    return {
      success: res.success,
      message: res.message,
      details: res.data,
    };
  }

  const testMessage = `پیام تست سامانه مدیریت مجوز کار (PTW)\nارتباط با سامانه پیامکی sms.ir با موفقیت برقرار شد.`;
  const res = await sendSmsIrBulk(config, cleanMobile, testMessage);
  return {
    success: res.success,
    message: res.message,
    details: res.data,
  };
}

/**
 * نرمال‌سازی شماره همراه ایران به فرمت استاندارد (0912xxxxxxx یا 98912xxxxxxx)
 */
export function normalizeIranianMobile(mobile: string): string {
  if (!mobile) return "";
  let clean = mobile.replace(/[^0-9+]/g, "");
  if (clean.startsWith("+98")) {
    clean = "0" + clean.slice(3);
  } else if (clean.startsWith("98")) {
    clean = "0" + clean.slice(2);
  } else if (clean.startsWith("0098")) {
    clean = "0" + clean.slice(4);
  }
  if (/^09[0-9]{9}$/.test(clean)) {
    return clean;
  }
  return "";
}
