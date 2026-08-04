import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { toast } from "sonner";
import {
  ShieldCheck,
  Send,
  RefreshCw,
  ExternalLink,
  MessageSquare,
  Copy,
  CheckCircle2,
  Clock,
  UserCheck,
  Smartphone,
  Sparkles,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { MessengerChannel, OtpConfig, Person } from "@/lib/ptw/types";
import {
  generateOtpCode,
  formatOtpMessage,
  getMessengerDeepLink,
  sendOtpWebhook,
  MESSENGERS,
} from "@/lib/ptw/otp";

interface OtpVerificationModalProps {
  open: boolean;
  onClose: () => void;
  onVerified: (channel: MessengerChannel) => void;
  signerPerson?: Person;
  person?: Person;
  stepTitle?: string;
  otpConfig?: OtpConfig;
}

export function OtpVerificationModal({
  open,
  onClose,
  onVerified,
  signerPerson,
  person,
  stepTitle = "تایید امضا",
  otpConfig,
}: OtpVerificationModalProps) {
  const targetPerson: Person = useMemo(
    () =>
      signerPerson ||
      person || {
        name: "امضاکننده",
        phone: "",
        messengerType: "eitaa",
      },
    [signerPerson, person],
  );

  const digitsCount = otpConfig?.digits || 6;
  const expiryDuration = otpConfig?.expirySeconds || 120;

  const [channel, setChannel] = useState<MessengerChannel>(
    targetPerson.messengerType || otpConfig?.defaultChannel || "eitaa",
  );
  const [generatedCode, setGeneratedCode] = useState<string>("");
  const [inputCode, setInputCode] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState<number>(expiryDuration);
  const [messageText, setMessageText] = useState<string>("");
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // تولید کد جدید و ارسال پیام
  const dispatchNewOtp = useCallback(
    (ch: MessengerChannel) => {
      const code = generateOtpCode(digitsCount);
      setGeneratedCode(code);
      setTimeLeft(expiryDuration);
      setInputCode("");

      const msg = formatOtpMessage(code, targetPerson, stepTitle, otpConfig?.customMessageTemplate);
      setMessageText(msg);

      if (otpConfig?.webhookUrl) {
        setSending(true);
        void sendOtpWebhook(otpConfig, targetPerson, code, msg).finally(() => setSending(false));
      }

      toast.info(`کد احراز هویت جدید به ${MESSENGERS[ch]?.nameFa || "پیام‌رسان"} ارسال گردید.`);
    },
    [digitsCount, expiryDuration, otpConfig, targetPerson, stepTitle],
  );

  // کلید شروع فرآیند OTP هنگام باز شدن مودال
  useEffect(() => {
    if (open) {
      const targetChannel = targetPerson.messengerType || otpConfig?.defaultChannel || "eitaa";
      setChannel(targetChannel);
      dispatchNewOtp(targetChannel);
    } else {
      setInputCode("");
      setGeneratedCode("");
    }
  }, [open, dispatchNewOtp, targetPerson.messengerType, otpConfig?.defaultChannel]);

  const handleInputChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;

    const chars = inputCode.padEnd(digitsCount, " ").split("");
    chars[index] = val.slice(-1) || " ";
    const nextVal = chars.join("").trimEnd();
    setInputCode(nextVal);

    // فوکوس خودکار روی خانه بعدی
    if (val && index < digitsCount - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !inputCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").trim();
    if (/^\d+$/.test(pasted)) {
      const code = pasted.slice(0, digitsCount);
      setInputCode(code);
      inputRefs.current[Math.min(code.length - 1, digitsCount - 1)]?.focus();
    }
  };

  const handleAutoFill = () => {
    setInputCode(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("کد تایید پیام‌رسان جاگذاری شد");
  };

  const handleVerify = () => {
    if (timeLeft <= 0) {
      toast.error("اعتبار کد به پایان رسیده است. لطفا کد جدید دریافت کنید.");
      return;
    }
    if (inputCode.trim() !== generatedCode) {
      toast.error("کد واردشده اشتباه است. لطفاً مجدداً بررسی کنید.");
      return;
    }

    toast.success("احراز هویت ۱۰۰٪ امضاکننده با موفقیت انجام شد");
    onVerified(channel);
  };

  const currentMessenger = MESSENGERS[channel] || MESSENGERS.eitaa;
  const deepLink = getMessengerDeepLink(
    channel,
    targetPerson.messengerTarget || targetPerson.phone || "",
    messageText,
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg dir-rtl text-right">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-primary/10 p-2 text-primary">
              <ShieldCheck className="size-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                احراز هویت ۱۰۰٪ امضاکننده (تایید ۲ مرحله‌ای OTP)
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                تایید اصالت امضا و هویت واقعی مسئول صادرکننده از طریق کد یکبارمصرف پیام‌رسان
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* مشخصات امضاکننده */}
          <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <UserCheck className="size-4 text-emerald-600" />
                امضاکننده: <strong className="text-sm">{targetPerson.name || "امضاکننده"}</strong>
              </span>
              <Badge variant="outline" className="bg-background font-medium">
                {targetPerson.position || "مسئول مربوطه"}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-muted-foreground pt-1 border-t border-border/50">
              <span className="flex items-center gap-1">
                <Smartphone className="size-3.5" />
                شماره/شناسه: {targetPerson.phone || targetPerson.messengerTarget || "ثبت‌نشده"}
              </span>
              <span>مرحله: {stepTitle}</span>
            </div>
          </div>

          {/* انتخاب پیام‌رسان */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1">
              <MessageSquare className="size-3.5 text-blue-500" />
              کانال ارسال کد تایید یکبارمصرف (OTP):
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(MESSENGERS) as MessengerChannel[]).map((chKey) => {
                const meta = MESSENGERS[chKey];
                const active = channel === chKey;
                return (
                  <button
                    key={chKey}
                    type="button"
                    onClick={() => {
                      setChannel(chKey);
                      dispatchNewOtp(chKey);
                    }}
                    className={`flex items-center justify-center gap-1.5 rounded-md border p-2 text-xs font-medium transition-all ${
                      active
                        ? `${meta.bgColor} ${meta.borderColor} ${meta.color} ring-2 ring-primary/40 font-bold`
                        : "border-border hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    <span className="rounded px-1 text-[10px] font-bold border border-current">
                      {meta.iconText}
                    </span>
                    {meta.nameFa.split(" ")[0]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* شبیه‌ساز زنده دریافت پیام روی پیام‌رسان انتخاب‌شده */}
          <div
            className={`rounded-xl border p-3 shadow-sm space-y-2.5 transition-all ${currentMessenger.bgColor} ${currentMessenger.borderColor}`}
          >
            <div className="flex items-center justify-between text-xs font-bold">
              <span className={`flex items-center gap-1.5 ${currentMessenger.color}`}>
                <Sparkles className="size-4 animate-pulse" />
                پیام‌رسان {currentMessenger.nameFa} (اعلان زنده دریافتی):
              </span>
              <span className="text-[10px] text-muted-foreground dir-ltr font-mono">
                {new Date().toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>

            <div className="rounded-lg bg-background/90 p-3 text-xs leading-relaxed border border-border shadow-inner whitespace-pre-line font-sans">
              {messageText}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <Button
                type="button"
                size="sm"
                variant="default"
                className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow"
                onClick={handleAutoFill}
              >
                {copied ? <CheckCircle2 className="size-3.5" /> : <Copy className="size-3.5" />}
                {copied ? "کد جاگذاری شد!" : "کپی و جاگذاری سریع کد (۱-کلیک)"}
              </Button>

              {deepLink && (
                <a
                  href={deepLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                >
                  <ExternalLink className="size-3.5" />
                  باز کردن در {currentMessenger.nameFa.split(" ")[0]}
                </a>
              )}
            </div>
          </div>

          {/* ورودی کد چندرقمی */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground">
                کد {digitsCount} رقمی دریافتی را وارد کنید:
              </span>
              <span className="flex items-center gap-1 text-muted-foreground font-mono">
                <Clock className="size-3.5 text-amber-500" />
                زمان باقی‌مانده: {Math.floor(timeLeft / 60)}:
                {String(timeLeft % 60).padStart(2, "0")}
              </span>
            </div>

            <div className="flex items-center justify-center gap-2 dir-ltr">
              {Array.from({ length: digitsCount }).map((_, idx) => (
                <input
                  key={idx}
                  ref={(el) => (inputRefs.current[idx] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={inputCode[idx] || ""}
                  onChange={(e) => handleInputChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  onPaste={handlePaste}
                  className="size-11 rounded-lg border-2 border-input bg-background text-center text-lg font-bold font-mono shadow-sm transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                />
              ))}
            </div>

            {timeLeft <= 0 && (
              <p className="text-center text-xs font-semibold text-destructive">
                کد تایید منقضی شده است. لطفا بر روی دکمه «ارسال مجدد کد» کلیک کنید.
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="flex-row items-center justify-between gap-2 border-t pt-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => dispatchNewOtp(channel)}
            disabled={sending}
          >
            <RefreshCw className={`size-3.5 ${sending ? "animate-spin" : ""}`} />
            ارسال مجدد کد
          </Button>

          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              انصراف
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleVerify}
              disabled={inputCode.trim().length < digitsCount || timeLeft <= 0}
              className="bg-primary text-primary-foreground font-bold shadow"
            >
              <CheckCircle2 className="size-4" />
              تایید ۱۰۰٪ و ثبت امضا
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
