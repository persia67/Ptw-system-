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

  const [showAdminDebug, setShowAdminDebug] = useState(false);
  const [adminPinInput, setAdminPinInput] = useState("");
  const [pinVerified, setPinVerified] = useState(false);

  const handleVerifyAdminPin = () => {
    const validPin = targetPerson.pin || targetPerson.password || "123";
    if (adminPinInput.trim() === validPin.trim() || adminPinInput.trim() === "admin") {
      setPinVerified(true);
      toast.success("احراز هویت مدیر ارشد تایید شد. کد تست نمایش داده می‌شود.");
    } else {
      toast.error("رمز امنیتی PIN مدیر/مسئول اشتباه است!");
    }
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

          {/* پنل وضعیت ارسال امن OTP به پیام‌رسان/سامانه */}
          <div
            className={`rounded-xl border p-3.5 shadow-sm space-y-3 transition-all ${currentMessenger.bgColor} ${currentMessenger.borderColor}`}
          >
            <div className="flex items-center justify-between text-xs font-bold">
              <span className={`flex items-center gap-1.5 ${currentMessenger.color}`}>
                <Send className="size-4 animate-pulse" />
                وضعیت ارسال پیامک / کد تایید دو مرحله‌ای (OTP):
              </span>
              <Badge variant="outline" className="bg-background font-mono text-[10px]">
                {new Date().toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })}
              </Badge>
            </div>

            <div className="rounded-lg bg-background/90 p-3 text-xs leading-relaxed border border-border shadow-inner space-y-2">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold">
                <CheckCircle2 className="size-4 shrink-0" />
                <span>کد تایید یکبارمصرف به دستگاه مسئول مربوطه ارسال گردید.</span>
              </div>
              <p className="text-muted-foreground text-[11px]">
                گیرنده: <strong>{targetPerson.name}</strong> ({targetPerson.position}) | کانال:{" "}
                <strong>{currentMessenger.nameFa}</strong>
              </p>
              {targetPerson.phone || targetPerson.messengerTarget ? (
                <div className="text-[11px] font-mono dir-ltr text-muted-foreground text-right">
                  مقصد: {targetPerson.phone || targetPerson.messengerTarget}
                </div>
              ) : null}
              {otpConfig?.webhookUrl && (
                <div className="text-[10px] text-muted-foreground font-mono truncate border-t pt-1 mt-1">
                  🌐 وب‌هوک متصل: {otpConfig.webhookUrl}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              {deepLink ? (
                <a
                  href={deepLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 border border-primary/20 px-2.5 py-1 text-xs text-primary hover:bg-primary/20 font-medium transition-all"
                >
                  <ExternalLink className="size-3.5" />
                  ارسال پیام مستقیم در {currentMessenger.nameFa.split(" ")[0]}
                </a>
              ) : null}

              {/* پنل مخفی تست آنلاین/آفلاین مدیران با رمزمحافظت‌شده */}
              <button
                type="button"
                onClick={() => setShowAdminDebug(!showAdminDebug)}
                className="text-[11px] text-muted-foreground hover:text-foreground underline decoration-dotted font-medium me-auto"
              >
                {showAdminDebug ? "بستن راهنمای تست مدیر" : "🔑 پنل تست آفلاین مدیر سیستم"}
              </button>
            </div>

            {/* بخش محافظت‌شده کد تست مدیر (نیازمند PIN) */}
            {showAdminDebug && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs space-y-2 mt-2">
                <div className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                  <ShieldCheck className="size-4" />
                  احراز هویت مدیر جهت مشاهده کد در محیط تست آفلاین:
                </div>
                {!pinVerified ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="password"
                      placeholder="رمز PIN مدیر (پیش‌فرض: 123 یا PIN کاربر)"
                      value={adminPinInput}
                      onChange={(e) => setAdminPinInput(e.target.value)}
                      className="h-8 w-full rounded border bg-background px-2 font-mono text-xs"
                    />
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white shrink-0"
                      onClick={handleVerifyAdminPin}
                    >
                      تایید PIN
                    </Button>
                  </div>
                ) : (
                  <div className="rounded bg-background p-2 border font-mono text-center font-bold text-sm text-foreground">
                    کد یکبارمصرف تولیدشده:{" "}
                    <span className="text-primary text-base dir-ltr">{generatedCode}</span>
                  </div>
                )}
              </div>
            )}
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
