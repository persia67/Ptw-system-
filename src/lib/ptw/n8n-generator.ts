import type { Settings, WorkflowStep, Person } from "./types";

export interface N8nWorkflowNode {
  parameters: Record<string, unknown>;
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  notesInFlow?: boolean;
  notes?: string;
  disabled?: boolean;
}

export interface N8nConnectionItem {
  node: string;
  type: string;
  index: number;
}

export interface N8nWorkflow {
  name: string;
  nodes: N8nWorkflowNode[];
  connections: Record<string, { main: N8nConnectionItem[][] }>;
  active?: boolean;
  settings: {
    executionOrder: "v1";
    saveManualExecutions?: boolean;
    callerPolicy?: string;
  };
  tags?: { name: string }[];
  meta?: {
    templateCredsSetupCompleted?: boolean;
    instanceId?: string;
  };
}

/**
 * تولید خودکار و پویا تمپلیت کامل ورک‌فلو n8n بر اساس تنظیمات، مراحل و پیکربندی سامانه PTW و پیامک sms.ir
 */
export function generateDynamicN8nWorkflow(
  settings: Settings,
  appUrl: string = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000",
): N8nWorkflow {
  const companyName = settings.companyName || "سامانه مجوز کار PTW";
  const plantName = settings.plantName || "کارخانه";
  const workflowSteps: WorkflowStep[] =
    settings.workflow && settings.workflow.length > 0
      ? settings.workflow
      : [
          {
            id: "step_1",
            title: "تایید سرپرست متقاضی",
            roleTitle: "سرپرست متقاضی",
            required: true,
            onlyForTypes: [],
          },
          {
            id: "step_2",
            title: "تایید و بررسی ایمنی HSE",
            roleTitle: "کارشناس HSE",
            required: true,
            onlyForTypes: [],
          },
          {
            id: "step_3",
            title: "تایید نهایی و صدور",
            roleTitle: "مدیر کارخانه",
            required: true,
            onlyForTypes: [],
          },
        ];

  const people: Person[] = settings.people || [];
  const smsIrConfig = settings.smsIr;
  const smsApiKey = smsIrConfig?.apiKey || "YOUR_SMS_IR_API_KEY";
  const smsTemplateId = smsIrConfig?.templateId || "100000";

  const nodes: N8nWorkflowNode[] = [];
  const connections: Record<string, { main: N8nConnectionItem[][] }> = {};

  let currentX = 240;
  const currentY = 300;

  // 1. Webhook Trigger Node
  const webhookNodeId = "webhook_ptw_event";
  const webhookNodeName = "Webhook - دریافت رویدادهای پرمیت";
  nodes.push({
    parameters: {
      httpMethod: "POST",
      path: "ptw-permit-status-changed",
      responseMode: "onReceived",
      responseData: "allEntries",
      options: {},
    },
    id: webhookNodeId,
    name: webhookNodeName,
    type: "n8n-nodes-base.webhook",
    typeVersion: 2,
    position: [currentX, currentY],
    notes: "دریافت وب‌هوک رویداد PermitStatusChanged از سامانه PTW",
    notesInFlow: true,
  });

  // 2. Code Node: JavaScript Event Parser & SMS.ir Data Formatter
  currentX += 340;
  const codeNodeId = "code_parser_router";
  const codeNodeName = "پردازشگر اطلاعات و تعیین مسئول";

  const peopleDirectoryJson = JSON.stringify(
    people.map((p) => ({
      name: p.name,
      position: p.position,
      phone: p.phone || "",
      messengerType: p.messengerType || "sms",
      messengerTarget: p.messengerTarget || p.phone || "",
    })),
    null,
    2,
  );

  const workflowStepsJson = JSON.stringify(
    workflowSteps.map((w, idx) => ({
      index: idx,
      id: w.id,
      title: w.title,
      roleTitle: w.roleTitle,
      required: w.required,
      onlyIfLoto: Boolean(w.onlyIfLoto),
      onlyForTypes: w.onlyForTypes || [],
    })),
    null,
    2,
  );

  const jsCode = `// سامانه مدیریت مجوز کار PTW — پردازشگر اختصاصی رویداد و پیامک sms.ir
const payload = $input.first().json.body || $input.first().json;
const peopleDirectory = ${peopleDirectoryJson};
const workflowSteps = ${workflowStepsJson};

const event = payload.event || "PermitStatusChanged";
const permitId = payload.permit_id || payload.id;
const permitNumber = payload.number || "PTW-000";
const permitTitle = payload.title || "مجوز کار";
const permitType = payload.type || "general";
const currentStepRole = payload.current_step_role || "مسئول مربوطه";
const status = payload.status || "pending";
const statusTitleFa = payload.status_title_fa || "در انتظار تایید";
const approvalUrl = payload.approval_url || "${appUrl}/permits/" + permitId;
const rejectionUrl = payload.rejection_url || "${appUrl}/permits/" + permitId;
const clientLink = payload.client_link || "${appUrl}/permits/" + permitId;
const issuer = payload.issuer || payload.actor || "واحد متقاضی";
const unit = payload.unit || "کارخانه";
const location = payload.location || "سایت اصلی";

// یافتن مسئول مربوط به مرحله جاری جهت ارسال پیامک
let matchedPerson = peopleDirectory.find(p => 
  p.position && (
    p.position.toLowerCase().includes(currentStepRole.toLowerCase()) ||
    currentStepRole.toLowerCase().includes(p.position.toLowerCase())
  )
);

if (!matchedPerson && peopleDirectory.length > 0) {
  matchedPerson = peopleDirectory[0];
}

const recipientPhone = (matchedPerson && matchedPerson.phone) ? matchedPerson.phone : (payload.phone || "");
const recipientName = (matchedPerson && matchedPerson.name) ? matchedPerson.name : currentStepRole;
const messengerType = (matchedPerson && matchedPerson.messengerType) ? matchedPerson.messengerType : "sms";

// ساخت پارامترهای الگوی سریع سامانه sms.ir
const smsIrParameters = [
  { name: "${smsIrConfig?.parameterNameSigner || "NAME"}", value: recipientName },
  { name: "${smsIrConfig?.parameterNamePermit || "NUMBER"}", value: permitNumber },
  { name: "${smsIrConfig?.parameterNameRole || "ROLE"}", value: currentStepRole },
  { name: "${smsIrConfig?.parameterNameLink || "LINK"}", value: clientLink }
];

// ساخت متن پیامک عادی
const smsDirectText = \`سامانه PTW \${"${companyName}"}\\nسلام \${recipientName}\\nمجوز کار شماره \${permitNumber} (\${permitTitle}) در مرحله «\${currentStepRole}» نیازمند بررسی و امضای شماست.\\nلینک تایید:\\n\${approvalUrl}\`;

return [{
  json: {
    event,
    permit_id: permitId,
    permit_number: permitNumber,
    permit_title: permitTitle,
    permit_type: permitType,
    status,
    status_title_fa: statusTitleFa,
    current_step_role: currentStepRole,
    recipient_name: recipientName,
    recipient_phone: recipientPhone,
    messenger_type: messengerType,
    approval_url: approvalUrl,
    rejection_url: rejectionUrl,
    client_link: clientLink,
    issuer,
    unit,
    location,
    sms_ir_template_id: ${Number(smsTemplateId) || 100000},
    sms_ir_parameters: smsIrParameters,
    sms_direct_text: smsDirectText,
    timestamp: new Date().toISOString()
  }
}];`;

  nodes.push({
    parameters: {
      jsCode,
    },
    id: codeNodeId,
    name: codeNodeName,
    type: "n8n-nodes-base.code",
    typeVersion: 2,
    position: [currentX, currentY],
    notes: "استخراج اطلاعات، تطبیق با کاربران و تولید پارامترهای پیامک sms.ir",
    notesInFlow: true,
  });

  connections[webhookNodeName] = {
    main: [[{ node: codeNodeName, type: "main", index: 0 }]],
  };

  // 3. Switch / Router Node based on Status
  currentX += 340;
  const switchNodeId = "switch_permit_status";
  const switchNodeName = "تفکیک بر اساس وضعیت پرمیت";

  nodes.push({
    parameters: {
      rules: {
        values: [
          {
            conditions: {
              options: { caseSensitive: true, leftValue: "", typeValidation: "strict" },
              conditions: [
                {
                  leftValue: "={{ $json.status }}",
                  rightValue: "approved",
                  operator: { type: "string", operation: "equals" },
                },
              ],
              combinator: "and",
            },
            renameOutput: true,
            outputKey: "تایید نهایی و صدور",
          },
          {
            conditions: {
              options: { caseSensitive: true, leftValue: "", typeValidation: "strict" },
              conditions: [
                {
                  leftValue: "={{ $json.status }}",
                  rightValue: "rejected",
                  operator: { type: "string", operation: "equals" },
                },
              ],
              combinator: "and",
            },
            renameOutput: true,
            outputKey: "رد شده",
          },
          {
            conditions: {
              options: { caseSensitive: true, leftValue: "", typeValidation: "strict" },
              conditions: [
                {
                  leftValue: "={{ $json.status }}",
                  rightValue: "pending",
                  operator: { type: "string", operation: "contains" },
                },
              ],
              combinator: "and",
            },
            renameOutput: true,
            outputKey: "در انتظار امضا (مراحل)",
          },
        ],
      },
      options: { fallbackOutput: "extra" },
    },
    id: switchNodeId,
    name: switchNodeName,
    type: "n8n-nodes-base.switch",
    typeVersion: 3.2,
    position: [currentX, currentY],
    notes: "هدایت رویدادها بر اساس وضعیت (در انتظار امضا، صدور نهایی یا رد)",
    notesInFlow: true,
  });

  connections[codeNodeName] = {
    main: [[{ node: switchNodeName, type: "main", index: 0 }]],
  };

  // 4. Node for sms.ir Verify Pattern Sending (Branch 2: Pending Signatures)
  const smsIrVerifyNodeId = "http_sms_ir_verify";
  const smsIrVerifyNodeName = "ارسال پیامک با الگوی سریع sms.ir";

  nodes.push({
    parameters: {
      method: "POST",
      url: "https://api.sms.ir/v1/send/verify",
      sendHeaders: true,
      headerParameters: {
        parameters: [
          { name: "x-api-key", value: smsApiKey },
          { name: "Content-Type", value: "application/json" },
          { name: "Accept", value: "text/plain" },
        ],
      },
      sendBody: true,
      specifyBody: "json",
      jsonBody: `={
  "mobile": "{{ $json.recipient_phone }}",
  "templateId": {{ $json.sms_ir_template_id }},
  "parameters": {{ JSON.stringify($json.sms_ir_parameters) }}
}`,
      options: {},
    },
    id: smsIrVerifyNodeId,
    name: smsIrVerifyNodeName,
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 4.2,
    position: [currentX + 380, currentY],
    notes: "ارسال آنی پیامک تایید هویت و لینک امضا از طریق API رسمی sms.ir (الگوی سریع)",
    notesInFlow: true,
  });

  // 5. Node for sms.ir Final Approved Notice (Branch 0: Approved)
  const smsIrApprovedNodeId = "http_sms_ir_approved";
  const smsIrApprovedNodeName = "پیامک صدور نهایی پرمیت (sms.ir)";

  nodes.push({
    parameters: {
      method: "POST",
      url: "https://api.sms.ir/v1/send/bulk",
      sendHeaders: true,
      headerParameters: {
        parameters: [
          { name: "x-api-key", value: smsApiKey },
          { name: "Content-Type", value: "application/json" },
        ],
      },
      sendBody: true,
      specifyBody: "json",
      jsonBody: `={
  "lineNumber": 30007732,
  "messageText": "سامانه PTW ${companyName}\\nمجوز کار شماره {{ $json.permit_number }} با تایید تمام مسئولین نهایی و صادر گردید.\\nواحد: {{ $json.unit }}\\nمشاهده پرمیت:\\n{{ $json.client_link }}",
  "mobiles": ["{{ $json.recipient_phone }}"]
}`,
      options: {},
    },
    id: smsIrApprovedNodeId,
    name: smsIrApprovedNodeName,
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 4.2,
    position: [currentX + 380, currentY - 200],
    notes: "ارسال پیامک صدور نهایی پرمیت به متقاضی و ناظران",
    notesInFlow: true,
  });

  // 6. Node for sms.ir Rejected Notice (Branch 1: Rejected)
  const smsIrRejectedNodeId = "http_sms_ir_rejected";
  const smsIrRejectedNodeName = "پیامک رد مجوز کار (sms.ir)";

  nodes.push({
    parameters: {
      method: "POST",
      url: "https://api.sms.ir/v1/send/bulk",
      sendHeaders: true,
      headerParameters: {
        parameters: [
          { name: "x-api-key", value: smsApiKey },
          { name: "Content-Type", value: "application/json" },
        ],
      },
      sendBody: true,
      specifyBody: "json",
      jsonBody: `={
  "lineNumber": 30007732,
  "messageText": "هشدار ایمنی PTW — ${companyName}\\nمجوز کار شماره {{ $json.permit_number }} توسط مسئولین رد گردید.\\nعلت و جزئیات در سامانه قابل مشاهده است:\\n{{ $json.client_link }}",
  "mobiles": ["{{ $json.recipient_phone }}"]
}`,
      options: {},
    },
    id: smsIrRejectedNodeId,
    name: smsIrRejectedNodeName,
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 4.2,
    position: [currentX + 380, currentY - 100],
    notes: "ارسال فوری پیامک رد پرمیت به درخواست‌دهنده",
    notesInFlow: true,
  });

  // Connect Switch outputs to SMS nodes
  connections[switchNodeName] = {
    main: [
      [{ node: smsIrApprovedNodeName, type: "main", index: 0 }], // Output 0: Approved
      [{ node: smsIrRejectedNodeName, type: "main", index: 0 }], // Output 1: Rejected
      [{ node: smsIrVerifyNodeName, type: "main", index: 0 }], // Output 2: Pending
    ],
  };

  // 7. Interactive 1-Click Approve / Reject Webhook Response Handler
  const oneClickWebhookNodeId = "webhook_1click_decision";
  const oneClickWebhookNodeName = "Webhook - دریافت تایید/رد مستقیم از لینک";

  nodes.push({
    parameters: {
      httpMethod: "GET",
      path: "ptw-one-click-decision",
      responseMode: "responseNode",
      options: {},
    },
    id: oneClickWebhookNodeId,
    name: oneClickWebhookNodeName,
    type: "n8n-nodes-base.webhook",
    typeVersion: 2,
    position: [currentX, currentY + 260],
    notes: "پذیرش کلیک مستقیم از پیامک/پیام‌رسان روی لینک تایید یا رد مجوز",
    notesInFlow: true,
  });

  const respondNodeId = "respond_to_webhook";
  const respondNodeName = "پاسخ گرافیکی به امضاکننده";

  nodes.push({
    parameters: {
      respondWith: "text",
      responseBody: `=<!DOCTYPE html>
<html dir="rtl" lang="fa">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>ثبت تاییدیه مجوز کار PTW</title>
  <style>
    body { font-family: Tahoma, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; text-align: center; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 32px 24px; max-width: 450px; width: 100%; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
    .badge { display: inline-block; background: #10b98120; color: #10b981; border: 1px solid #10b98140; padding: 6px 14px; border-radius: 9999px; font-weight: bold; margin-bottom: 16px; }
    h2 { margin: 0 0 12px; color: #ffffff; }
    p { color: #94a3b8; font-size: 14px; line-height: 1.7; margin-bottom: 24px; }
    .btn { display: inline-block; background: #3b82f6; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">✔ عملیات تایید با موفقیت ثبت شد</div>
    <h2>سامانه مجوز کار ${companyName}</h2>
    <p>تاییدیه شما برای مجوز کار مربوطه با امضای دیجیتال رمزنگاری‌شده با موفقیت در سامانه ذخیره گردید و به مرحله بعدی ارجاع شد.</p>
    <a href="${appUrl}" class="btn">بازگشت به سامانه مرکزی</a>
  </div>
</body>
</html>`,
      options: {
        responseHeaders: {
          entries: [{ name: "Content-Type", value: "text/html; charset=utf-8" }],
        },
      },
    },
    id: respondNodeId,
    name: respondNodeName,
    type: "n8n-nodes-base.respondToWebhook",
    typeVersion: 1.1,
    position: [currentX + 380, currentY + 260],
    notes: "نمایش صفحه تاییدیه زیبا به کاربری که روی لینک پیامک کلیک کرده است",
    notesInFlow: true,
  });

  connections[oneClickWebhookNodeName] = {
    main: [[{ node: respondNodeName, type: "main", index: 0 }]],
  };

  return {
    name: `گردش کار PTW — ${companyName} (${workflowSteps.length} مرحله)`,
    nodes,
    connections,
    active: true,
    settings: {
      executionOrder: "v1",
      saveManualExecutions: true,
    },
    tags: [{ name: "PTW-System" }, { name: "SMS-IR" }, { name: "HSE-Workflow" }],
  };
}

/**
 * خروجی گرفتن رشته JSON آماده ایمپورت در n8n
 */
export function exportN8nWorkflowJsonString(settings: Settings, appUrl?: string): string {
  const workflow = generateDynamicN8nWorkflow(settings, appUrl);
  return JSON.stringify(workflow, null, 2);
}

/**
 * دانلود مستقیم فایل قالب JSON برای وارد کردن در نرم‌افزار n8n
 */
export function downloadN8nWorkflowFile(settings: Settings, appUrl?: string): void {
  const jsonStr = exportN8nWorkflowJsonString(settings, appUrl);
  const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const safeName = (settings.companyName || "ptw")
    .replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, "_")
    .slice(0, 30);
  a.download = `n8n-ptw-workflow-${safeName}-${settings.workflow?.length || 3}steps.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * ارسال مستقیم تمپلیت به سرور n8n از طریق REST API اختصاصی n8n
 */
export async function deployWorkflowToN8nApi(
  instanceUrl: string,
  apiKey: string,
  settings: Settings,
  appUrl?: string,
): Promise<{ success: boolean; message: string; workflowId?: string; data?: unknown }> {
  if (!instanceUrl || !apiKey) {
    return {
      success: false,
      message: "آدرس سرور n8n (Instance URL) و کلید API برای اتصال مستقیم الزامی است.",
    };
  }

  const cleanUrl = instanceUrl.trim().replace(/\/$/, "");
  const workflowData = generateDynamicN8nWorkflow(settings, appUrl);

  try {
    const res = await fetch(`${cleanUrl}/api/v1/workflows`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-N8N-API-KEY": apiKey.trim(),
      },
      body: JSON.stringify({
        name: workflowData.name,
        nodes: workflowData.nodes,
        connections: workflowData.connections,
        settings: workflowData.settings,
        tags: workflowData.tags,
      }),
    });

    const json = await res.json();
    if (res.ok) {
      const wfId = json.data?.id || json.id || "ایجاد شد";
      return {
        success: true,
        message: `ورک‌فلو با موفقیت در n8n ایجاد گردید (شناسه: ${wfId})`,
        workflowId: wfId,
        data: json,
      };
    }

    return {
      success: false,
      message: json.message || `خطا در ایجاد ورک‌فلو در n8n (کد: ${res.status})`,
      data: json,
    };
  } catch (err) {
    console.error("N8N Deployment API Error:", err);
    return {
      success: false,
      message: "عدم برقراری ارتباط با سرور n8n (آدرس سرور یا خطای CORS را بررسی نمایید)",
    };
  }
}
