import type { MessengerChannel, OtpConfig, Person } from "./types";

export interface MessengerMeta {
  id: MessengerChannel;
  nameFa: string;
  color: string;
  bgColor: string;
  borderColor: string;
  iconText: string;
  badgeClass: string;
}

export const MESSENGERS: Record<MessengerChannel, MessengerMeta> = {
  eitaa: {
    id: "eitaa",
    nameFa: "ایتا (Eitaa)",
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
    iconText: "ایتا",
    badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  },
  bale: {
    id: "bale",
    nameFa: "بله (Bale)",
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30",
    iconText: "بله",
    badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  },
  whatsapp: {
    id: "whatsapp",
    nameFa: "واتساپ (WhatsApp)",
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/30",
    iconText: "WA",
    badgeClass: "bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/30",
  },
  telegram: {
    id: "telegram",
    nameFa: "تلگرام (Telegram)",
    color: "text-sky-600 dark:text-sky-400",
    bgColor: "bg-sky-500/10",
    borderColor: "border-sky-500/30",
    iconText: "TG",
    badgeClass: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
  },
  sms: {
    id: "sms",
    nameFa: "پیامک (SMS)",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    iconText: "SMS",
    badgeClass: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
  },
  simulator: {
    id: "simulator",
    nameFa: "شبیه‌ساز مستقیم سیستم",
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/30",
    iconText: "SIM",
    badgeClass: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
  },
};

/** تولید یک کد یکبارمصرف تصادفی ۴ یا ۶ رقمی */
export function generateOtpCode(digits: 4 | 6 = 6): string {
  if (digits === 4) {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/** ساخت متن پیام احراز هویت */
export function formatOtpMessage(
  code: string,
  person: Person,
  stepTitle: string,
  template?: string,
): string {
  if (template) {
    return template
      .replace(/{CODE}/g, code)
      .replace(/{NAME}/g, person.name || "امضاکننده")
      .replace(/{ROLE}/g, person.position || "مسئول مربوطه")
      .replace(/{STEP}/g, stepTitle);
  }

  return `🔑 کد احراز هویت ۱۰۰٪ امضای مجوز کار (PTW)\n\nسلام ${person.name || "امضاکننده محترم"}\nجهت تایید هویت و ثبت امضا برای مرحله «${stepTitle}»، کد تایید زیر را در سامانه وارد نمایید:\n\nکد تایید: ${code}\n\n(اعتبار کد: ۲ دقیقه)`;
}

/** تولید لینک ارسال یا باز کردن مستقیم پیام‌رسان */
export function getMessengerDeepLink(
  channel: MessengerChannel,
  target: string,
  message: string,
): string | null {
  const cleanTarget = target.trim().replace(/^@/, "");
  const encodedText = encodeURIComponent(message);

  switch (channel) {
    case "eitaa":
      if (cleanTarget) {
        return `https://eitaa.com/${cleanTarget}`;
      }
      return `https://eitaa.com`;

    case "bale":
      if (cleanTarget) {
        return `https://ble.ir/${cleanTarget}`;
      }
      return `https://ble.ir`;

    case "whatsapp": {
      const num = cleanTarget.replace(/\+/g, "");
      if (num) {
        return `https://wa.me/${num}?text=${encodedText}`;
      }
      return `https://wa.me/?text=${encodedText}`;
    }

    case "telegram":
      if (cleanTarget) {
        return `https://t.me/${cleanTarget}`;
      }
      return `https://t.me/share/url?url=&text=${encodedText}`;

    case "sms":
      if (cleanTarget) {
        return `sms:${cleanTarget}?body=${encodedText}`;
      }
      return null;

    default:
      return null;
  }
}

/** ارسال به Webhook در صورت وجود تنظیمات کلاینت/سرور */
export async function sendOtpWebhook(
  config: OtpConfig,
  recipient: Person,
  code: string,
  message: string,
): Promise<boolean> {
  if (!config.webhookUrl) return false;
  try {
    const res = await fetch(config.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "PTW_SIGNATURE_OTP",
        recipientName: recipient.name,
        phone: recipient.phone,
        messengerType: recipient.messengerType || config.defaultChannel,
        messengerTarget: recipient.messengerTarget,
        code,
        message,
        timestamp: new Date().toISOString(),
      }),
    });
    return res.ok;
  } catch (err) {
    console.error("OTP Webhook delivery failed:", err);
    return false;
  }
}
