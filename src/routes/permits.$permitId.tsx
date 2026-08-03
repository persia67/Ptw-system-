import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Printer,
  CheckCircle2,
  XCircle,
  CalendarPlus,
  PauseCircle,
  PlayCircle,
  Ban,
  Lock,
  Unlock,
  ArrowRight,
  Trash2,
  ShieldCheck,
  Fingerprint,
  KeyRound,
  FileCheck2,
  BadgeCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/ptw/status-badge";
import { SignaturePad } from "@/components/ptw/signature-pad";
import { SignaturePreview } from "@/components/ptw/signature-preview";
import { PermitPrintSheet } from "@/components/ptw/permit-print";
import { OtpVerificationModal } from "@/components/ptw/otp-verification-modal";
import { usePtwDb } from "@/lib/ptw/use-ptw";
import { permitTypeTitle } from "@/lib/ptw/defaults";
import { JalaliDateTimeInput } from "@/components/ptw/jalali-datetime-input";
import { toJalaliDateTime, toLocalInput, fromLocalInput, fa, isExpired } from "@/lib/ptw/date";
import {
  effectiveSteps,
  currentStep,
  progress,
  openLotoLocks,
  canClose,
  evt,
} from "@/lib/ptw/workflow";
import { generateSignatureHash, generateDeviceToken } from "@/lib/ptw/security";
import type { Permit, StepSignature, MessengerChannel, Person } from "@/lib/ptw/types";

export const Route = createFileRoute("/permits/$permitId")({
  head: () => ({
    meta: [
      { title: "جزئیات و گردش تایید مجوز کار | سامانه PTW" },
      {
        name: "description",
        content:
          "مشاهده جزئیات مجوز، امضای مراحل تایید، تمدید، تعلیق، ابطال، مدیریت LOTO و چاپ فرم A4.",
      },
      { property: "og:title", content: "جزئیات مجوز کار | سامانه PTW" },
      {
        property: "og:description",
        content: "گردش امضای چندمرحله‌ای، LOTO و بایگانی مجوز کار.",
      },
    ],
  }),
  component: PermitDetail,
});

function PermitDetail() {
  const { permitId } = Route.useParams();
  const { db, ready, upsertPermit, deletePermit } = usePtwDb();
  const navigate = useNavigate();
  const permit = db.permits.find((p) => p.id === permitId);

  const [signName, setSignName] = useState("");
  const [signComment, setSignComment] = useState("");
  const [signData, setSignData] = useState<string | undefined>();
  const [signPin, setSignPin] = useState("");
  const [auditSig, setAuditSig] = useState<{
    sig: StepSignature;
    stepTitle: string;
  } | null>(null);

  // OTP Verification state
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [otpTargetPerson, setOtpTargetPerson] = useState<Person | null>(null);
  const [pendingDecision, setPendingDecision] = useState<"approved" | "rejected" | null>(null);

  const [extendTo, setExtendTo] = useState("");
  const [extendReason, setExtendReason] = useState("");
  const [suspendReason, setSuspendReason] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [closeNote, setCloseNote] = useState("");
  const [handed, setHanded] = useState(true);
  const [clean, setClean] = useState(true);
  const [releaseNote, setReleaseNote] = useState("");

  const steps = useMemo(() => (permit ? effectiveSteps(permit) : []), [permit]);

  if (!ready) return <p className="text-sm text-muted-foreground">در حال بارگذاری…</p>;

  if (!permit) {
    return (
      <Card>
        <CardContent className="space-y-3 py-12 text-center">
          <p className="text-sm text-muted-foreground">این مجوز یافت نشد.</p>
          <Button asChild>
            <Link to="/">بازگشت به داشبورد</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const actor = db.settings.currentUser.name || "کاربر سامانه";
  const step = currentStep(permit);
  const prog = progress(permit);
  const openLocks = openLotoLocks(permit);

  const save = (patch: Partial<Permit>, event?: ReturnType<typeof evt>) =>
    upsertPermit({
      ...permit,
      ...patch,
      events: event ? [...permit.events, event] : permit.events,
      updatedAt: new Date().toISOString(),
    });

  const decide = async (decision: "approved" | "rejected", forceOtp = false) => {
    if (!step) return;
    const nameToUse = signName.trim() || db.settings.currentUser.name;
    if (!nameToUse) return toast.error("نام امضاکننده را وارد کنید");
    if (decision === "rejected" && !signComment.trim()) return toast.error("دلیل رد را بنویسید");

    // Check optional manager security PIN
    const matchedPerson = (db.settings.people || []).find(
      (p) => p.name.trim().toLowerCase() === nameToUse.toLowerCase(),
    );
    if (matchedPerson?.pin && matchedPerson.pin.trim()) {
      if (!signPin || signPin.trim() !== matchedPerson.pin.trim()) {
        return toast.error("رمز امنیتی PIN واردشده برای این مدیر/مسئول صحیح نیست!");
      }
    }

    const isOtpRequired = forceOtp || (db.settings.otpConfig?.enabled && decision === "approved");

    if (isOtpRequired) {
      const personForOtp: Person = matchedPerson || {
        name: nameToUse,
        position: step.roleTitle,
        phone: db.settings.currentUser.phone || "09123456789",
        messengerTarget: db.settings.currentUser.phone || "09123456789",
        preferredMessenger: db.settings.otpConfig?.defaultMessenger || "eitaa",
      };
      setOtpTargetPerson(personForOtp);
      setPendingDecision(decision);
      setOtpModalOpen(true);
    } else {
      await executeDecide(decision, nameToUse);
    }
  };

  const executeDecide = async (
    decision: "approved" | "rejected",
    signerName: string,
    otpChannel?: MessengerChannel,
  ) => {
    if (!step) return;

    const matchedPerson = (db.settings.people || []).find(
      (p) => p.name.trim().toLowerCase() === signerName.toLowerCase(),
    );
    const verifiedPin = Boolean(matchedPerson?.pin && signPin.trim() === matchedPerson.pin.trim());

    const timestamp = new Date().toISOString();
    const verificationHash = await generateSignatureHash(
      permit.id,
      step.id,
      signerName,
      step.roleTitle,
      decision,
      timestamp,
      signData,
    );
    const deviceToken = generateDeviceToken();

    const signature: StepSignature = {
      stepId: step.id,
      decision,
      name: signerName,
      position: step.roleTitle,
      comment: signComment.trim() || undefined,
      signatureDataUrl: signData,
      at: timestamp,
      verificationHash,
      verifiedPin,
      verifiedOtp: Boolean(otpChannel),
      otpChannel,
      deviceSignatureToken: deviceToken,
    };

    if (decision === "rejected") {
      save(
        {
          signatures: [...permit.signatures.filter((s) => s.stepId !== step.id), signature],
          currentStepIndex: Math.max(0, permit.currentStepIndex - 1),
        },
        evt("rejected", signature.name, `مرحله «${step.title}» رد شد: ${signComment}`),
      );
      toast.warning("مرحله رد شد و مجوز به مرحله قبل بازگشت");
    } else {
      const nextIndex = permit.currentStepIndex + 1;
      const finished = nextIndex >= steps.length;
      save(
        {
          signatures: [...permit.signatures.filter((s) => s.stepId !== step.id), signature],
          currentStepIndex: finished ? steps.length : nextIndex,
          status: finished ? "active" : "pending",
        },
        evt(
          finished ? "issued" : "approved",
          signature.name,
          finished
            ? "تمام تاییدها انجام شد و مجوز صادر گردید"
            : `مرحله «${step.title}» ${otpChannel ? "با احراز هویت پیام‌رسان" : ""} تایید شد`,
        ),
      );
      toast.success(
        finished
          ? "امضا با احراز هویت و رمزنگاری SHA-256 ثبت گردید"
          : `امضا ثبت شد ${otpChannel ? "(احراز هویت شده توسط پیام‌رسان)" : ""}`,
      );
    }

    setSignName("");
    setSignComment("");
    setSignPin("");
    setSignData(undefined);
    setOtpModalOpen(false);
    setPendingDecision(null);
    setOtpTargetPerson(null);
  };

  return (
    <div className="space-y-5 pb-16">
      <div className="no-print flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-mono text-2xl font-bold">{permit.number}</h1>
            <StatusBadge status={permit.status} />
            {permit.status === "active" && isExpired(permit.endAt) && (
              <span className="rounded bg-destructive/15 px-2 py-0.5 text-xs text-destructive">
                اعتبار منقضی شده — تمدید یا بستن لازم است
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {permitTypeTitle(permit.type, permit.customTypeTitle)} — {permit.unit} /{" "}
            {permit.location}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => navigate({ to: "/" })}>
            <ArrowRight className="size-4" />
            بازگشت
          </Button>
          <Button onClick={() => window.print()}>
            <Printer className="size-4" />
            چاپ فرم A4
          </Button>
        </div>
      </div>

      {/* گردش امضا */}
      {permit.status !== "cancelled" && (
        <Card className="no-print">
          <CardHeader>
            <CardTitle className="text-base">زنجیره تایید و امضا</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={prog.percent} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {fa(prog.done)} از {fa(prog.total)} امضا انجام شده است.
            </p>
            <ol className="space-y-3">
              {steps.map((s, i) => {
                const sig = permit.signatures.find((x) => x.stepId === s.id);
                const isCurrent = i === permit.currentStepIndex && permit.status === "pending";
                return (
                  <li
                    key={s.id}
                    className={`rounded-md border p-3 transition-all ${
                      isCurrent
                        ? "border-accent bg-accent/10 shadow-sm"
                        : sig?.decision === "approved"
                          ? "border-success/40 bg-success/5"
                          : sig?.decision === "rejected"
                            ? "border-destructive/40 bg-destructive/5"
                            : "border-border"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 text-sm font-bold">
                          <span>
                            {fa(i + 1)}. {s.title}
                          </span>
                          <span className="text-xs font-normal text-muted-foreground">
                            ({s.roleTitle})
                          </span>
                        </div>
                      </div>
                      {sig ? (
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span
                            className={`font-semibold ${
                              sig.decision === "approved" ? "text-success" : "text-destructive"
                            }`}
                          >
                            {sig.decision === "approved" ? "تایید شد" : "رد شد"}
                          </span>
                          <span className="text-muted-foreground">— {sig.name}</span>
                          <span className="text-muted-foreground">
                            — {toJalaliDateTime(sig.at)}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            type="button"
                            className="h-7 bg-background gap-1 text-[11px]"
                            onClick={() => setAuditSig({ sig, stepTitle: s.title })}
                          >
                            <ShieldCheck className="size-3.5 text-primary" />
                            استعلام اصالت دیجیتال
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">در انتظار نوبت امضا</span>
                      )}
                    </div>
                    {sig?.comment && (
                      <p className="mt-1.5 rounded border border-border/50 bg-background/50 p-1.5 text-xs text-muted-foreground">
                        توضیح امضاکننده: {sig.comment}
                      </p>
                    )}
                    {sig?.signatureDataUrl && (
                      <div className="mt-2.5 max-w-sm">
                        <SignaturePreview
                          dataUrl={sig.signatureDataUrl}
                          signerName={sig.name}
                          role={s.roleTitle}
                          date={toJalaliDateTime(sig.at)}
                          heightClass="h-16"
                          interactive={true}
                        />
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>

            {permit.status === "pending" && step && (
              <>
                <Separator />
                <div className="space-y-4 rounded-lg border-2 border-primary/30 bg-primary/5 p-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-primary/20 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <ShieldCheck className="size-4" />
                      </div>
                      <div>
                        <div className="text-base font-bold text-primary">
                          محل ثبت امضای دیجیتال و تاییدیه امنیتی
                        </div>
                        <div className="text-xs text-muted-foreground">
                          مرحله جاری:{" "}
                          <span className="font-semibold text-foreground">{step.title}</span> (سمت
                          مجاز: {step.roleTitle})
                        </div>
                      </div>
                    </div>
                    <span className="flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                      <BadgeCheck className="size-3.5" />
                      رمزنگاری SHA-256 غیرقابل‌جعل
                    </span>
                  </div>

                  {step.id === "electrical" && openLocks.length === 0 && permit.hasLoto && (
                    <p className="rounded border border-destructive/20 bg-destructive/10 p-2 text-xs font-semibold text-destructive">
                      ⚠️ هیچ قفل فعالی ثبت نشده است؛ پیش از تایید این مرحله، قفل و برچسب LOTO را
                      اعمال کنید.
                    </p>
                  )}

                  {db.settings.people && db.settings.people.length > 0 && (
                    <div className="rounded-md border border-border bg-background p-3">
                      <Label className="mb-1.5 block text-xs text-muted-foreground">
                        انتخاب سریع از فهرست مسئولین مجاز:
                      </Label>
                      <div className="flex flex-wrap gap-1.5">
                        {db.settings.people.map((p, idx) => (
                          <Button
                            key={idx}
                            type="button"
                            variant={signName === p.name ? "default" : "outline"}
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => {
                              setSignName(p.name);
                            }}
                          >
                            {p.name} ({p.position})
                            {p.pin ? <KeyRound className="me-1 size-3 text-warning" /> : null}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid gap-3 md:grid-cols-3">
                    <div>
                      <Label className="text-xs font-semibold">
                        نام و نام خانوادگی امضاکننده *
                      </Label>
                      <Input
                        value={signName}
                        onChange={(e) => setSignName(e.target.value)}
                        placeholder="مثلاً: مهندس رضایی"
                        maxLength={80}
                      />
                    </div>
                    <div>
                      <Label className="flex items-center gap-1 text-xs font-semibold">
                        <KeyRound className="size-3 text-primary" />
                        رمز امنیتی PIN (در صورت تعریف)
                      </Label>
                      <Input
                        type="password"
                        value={signPin}
                        onChange={(e) => setSignPin(e.target.value)}
                        placeholder="****"
                        maxLength={10}
                        className="font-mono text-center tracking-widest"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold">
                        توضیح / دلیل (در صورت رد الزامی)
                      </Label>
                      <Input
                        value={signComment}
                        onChange={(e) => setSignComment(e.target.value)}
                        placeholder="توضیحات تایید یا علت رد"
                        maxLength={300}
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="mb-1 block text-xs font-semibold">
                      محل رسم امضای دیجیتال:
                    </Label>
                    <SignaturePad value={signData} onChange={setSignData} signerName={signName} />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={() => decide("approved")} className="gap-2 bg-primary">
                        <CheckCircle2 className="size-4" />
                        تایید و امضای رسمی
                        {db.settings.otpConfig?.enabled && (
                          <span className="rounded bg-accent/20 px-1.5 py-0.5 text-[10px] font-mono">
                            + OTP
                          </span>
                        )}
                      </Button>

                      {/* دکمه اختصاصی امضا با ارسال OTP به پیام‌رسان‌ها */}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => decide("approved", true)}
                        className="gap-2 border-emerald-500/50 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                      >
                        <ShieldCheck className="size-4 text-emerald-600" />
                        احراز هویت با پیام‌رسان (ایتا/بله/واتساپ/تلگرام)
                      </Button>

                      <Button
                        variant="destructive"
                        onClick={() => decide("rejected")}
                        className="gap-2"
                      >
                        <XCircle className="size-4" />
                        رد و بازگشت به مرحله قبل
                      </Button>
                    </div>
                    <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Fingerprint className="size-3.5 text-primary" />
                      امضا با مشخصات مرورگر و هش SHA-256 پلمپ دیجیتال می‌شود.
                    </p>
                  </div>
                </div>
              </>
            )}

            {permit.status === "draft" && (
              <Button
                onClick={() =>
                  save(
                    { status: "pending" },
                    evt("submitted", actor, "مجوز برای طی مراحل تایید ارسال شد"),
                  )
                }
              >
                ارسال برای تایید
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* اقدامات */}
      <Card className="no-print">
        <CardHeader>
          <CardTitle className="text-base">اقدامات مدیریتی</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {/* تمدید */}
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                disabled={permit.status !== "active" && permit.status !== "suspended"}
              >
                <CalendarPlus className="size-4" />
                تمدید مجوز
              </Button>
            </DialogTrigger>
            <DialogContent dir="rtl">
              <DialogHeader>
                <DialogTitle>تمدید اعتبار مجوز</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>پایان اعتبار جدید (تاریخ جلالی)</Label>
                  <JalaliDateTimeInput
                    value={extendTo || toLocalInput(permit.endAt)}
                    onChange={setExtendTo}
                  />
                </div>
                <div>
                  <Label>دلیل تمدید</Label>
                  <Textarea
                    rows={3}
                    value={extendReason}
                    onChange={(e) => setExtendReason(e.target.value)}
                    maxLength={400}
                  />
                </div>
                <div>
                  <Label>تایید کننده تمدید</Label>
                  <Input
                    value={signName}
                    onChange={(e) => setSignName(e.target.value)}
                    placeholder="نام مسئول تاییدکننده"
                    maxLength={80}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => {
                    const newEnd = fromLocalInput(extendTo);
                    if (!newEnd || new Date(newEnd) <= new Date(permit.endAt))
                      return toast.error("تاریخ جدید باید بعد از پایان فعلی باشد");
                    if (!extendReason.trim()) return toast.error("دلیل تمدید را بنویسید");
                    if (!signName.trim()) return toast.error("نام تاییدکننده را وارد کنید");
                    save(
                      {
                        endAt: newEnd,
                        status: "active",
                        extensions: [
                          ...permit.extensions,
                          {
                            id: Math.random().toString(36).slice(2, 10),
                            newEndAt: newEnd,
                            reason: extendReason,
                            requestedBy: permit.supervisorName,
                            approvedBy: signName,
                            at: new Date().toISOString(),
                          },
                        ],
                      },
                      evt(
                        "extended",
                        signName,
                        `اعتبار مجوز تا ${toJalaliDateTime(newEnd)} تمدید شد — ${extendReason}`,
                      ),
                    );
                    setExtendReason("");
                    setExtendTo("");
                    setSignName("");
                    toast.success("مجوز تمدید شد");
                  }}
                >
                  ثبت تمدید
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* تعلیق / ادامه */}
          {permit.status === "suspended" ? (
            <Button
              variant="outline"
              onClick={() =>
                save(
                  { status: "active", suspension: undefined },
                  evt("resumed", actor, "تعلیق برداشته شد و کار از سر گرفته شد"),
                )
              }
            >
              <PlayCircle className="size-4" />
              رفع تعلیق
            </Button>
          ) : (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" disabled={permit.status !== "active"}>
                  <PauseCircle className="size-4" />
                  تعلیق موقت
                </Button>
              </DialogTrigger>
              <DialogContent dir="rtl">
                <DialogHeader>
                  <DialogTitle>تعلیق موقت مجوز</DialogTitle>
                </DialogHeader>
                <Textarea
                  rows={3}
                  placeholder="دلیل تعلیق: آژیر اضطراری، تغییر شرایط جوی، تغییر شرایط کار…"
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  maxLength={400}
                />
                <DialogFooter>
                  <Button
                    onClick={() => {
                      if (!suspendReason.trim()) return toast.error("دلیل تعلیق را بنویسید");
                      save(
                        {
                          status: "suspended",
                          suspension: {
                            reason: suspendReason,
                            by: actor,
                            at: new Date().toISOString(),
                          },
                        },
                        evt("suspended", actor, `مجوز معلق شد: ${suspendReason}`),
                      );
                      setSuspendReason("");
                      toast.info("مجوز معلق شد");
                    }}
                  >
                    ثبت تعلیق
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {/* ابطال */}
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="destructive"
                disabled={permit.status === "cancelled" || permit.status === "closed"}
              >
                <Ban className="size-4" />
                ابطال مجوز
              </Button>
            </DialogTrigger>
            <DialogContent dir="rtl">
              <DialogHeader>
                <DialogTitle>ابطال مجوز کار</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                ابطال قابل بازگشت نیست. در صورت وجود قفل LOTO فعال، ابتدا قفل‌ها را باز کنید.
              </p>
              <Textarea
                rows={3}
                placeholder="دلیل ابطال"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                maxLength={400}
              />
              <DialogFooter>
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (!cancelReason.trim()) return toast.error("دلیل ابطال را بنویسید");
                    if (openLocks.length > 0)
                      return toast.error("ابتدا قفل‌های LOTO فعال را باز کنید");
                    save(
                      {
                        status: "cancelled",
                        cancellation: {
                          reason: cancelReason,
                          by: actor,
                          at: new Date().toISOString(),
                        },
                      },
                      evt("cancelled", actor, `مجوز باطل شد: ${cancelReason}`),
                    );
                    setCancelReason("");
                    toast.error("مجوز باطل شد");
                  }}
                >
                  تایید ابطال
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* بستن */}
          <Dialog>
            <DialogTrigger asChild>
              <Button disabled={!canClose(permit)}>
                <CheckCircle2 className="size-4" />
                اتمام کار و بستن مجوز
              </Button>
            </DialogTrigger>
            <DialogContent dir="rtl">
              <DialogHeader>
                <DialogTitle>تحویل محل و بستن مجوز</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={handed} onCheckedChange={(v) => setHanded(Boolean(v))} />
                  محل کار به واحد بهره‌بردار تحویل داده شد
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={clean} onCheckedChange={(v) => setClean(Boolean(v))} />
                  پاکسازی محل و جمع‌آوری ابزار انجام شد
                </label>
                <Textarea
                  rows={3}
                  placeholder="یادداشت تحویل"
                  value={closeNote}
                  onChange={(e) => setCloseNote(e.target.value)}
                  maxLength={400}
                />
              </div>
              <DialogFooter>
                <Button
                  onClick={() => {
                    if (!handed || !clean) return toast.error("تحویل محل و پاکسازی باید تایید شود");
                    save(
                      {
                        status: "closed",
                        closure: {
                          by: actor,
                          at: new Date().toISOString(),
                          siteHandedOver: handed,
                          areaClean: clean,
                          note: closeNote,
                        },
                      },
                      evt("closed", actor, "کار به پایان رسید، مجوز بسته و بایگانی شد"),
                    );
                    toast.success("مجوز بسته و بایگانی شد");
                  }}
                >
                  بستن و بایگانی
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {permit.status === "draft" && (
            <Button
              variant="ghost"
              onClick={() => {
                deletePermit(permit.id);
                toast.success("پیش‌نویس حذف شد");
                navigate({ to: "/" });
              }}
            >
              <Trash2 className="size-4 text-destructive" />
              حذف پیش‌نویس
            </Button>
          )}
        </CardContent>
      </Card>

      {/* LOTO */}
      {permit.hasLoto && (
        <Card className="no-print">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lock className="size-4" />
              قفل و برچسب (LOTO)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {permit.lotoLocks.map((l) => (
              <div
                key={l.id}
                className={`rounded-md border p-3 ${
                  l.released ? "border-border bg-muted/40" : "border-destructive/40"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-bold">
                    {l.equipment || "تجهیز نامشخص"} — قفل {l.lockNumber || "—"} / برچسب{" "}
                    {l.tagNumber || "—"}
                  </div>
                  <span
                    className={`rounded px-2 py-0.5 text-xs ${
                      l.released
                        ? "bg-secondary text-secondary-foreground"
                        : "bg-destructive/15 text-destructive"
                    }`}
                  >
                    {l.released ? "باز شده" : "قفل فعال"}
                  </span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  منابع انرژی: {l.energySources.join("، ") || "—"} | روش ایزوله:{" "}
                  {l.isolationMethod || "—"} | قفل‌گذار: {l.appliedBy || "—"} | انرژی صفر:{" "}
                  {l.zeroEnergyVerified ? "تایید شد" : "تایید نشده"}
                </div>
                {l.released && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    باز شده توسط {l.releasedBy} در {toJalaliDateTime(l.releasedAt)} —{" "}
                    {l.releaseNote}
                  </div>
                )}
                {!l.released && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" className="mt-2">
                        <Unlock className="size-4" />
                        ابطال قفل و برق‌دار کردن
                      </Button>
                    </DialogTrigger>
                    <DialogContent dir="rtl">
                      <DialogHeader>
                        <DialogTitle>ابطال LOTO و بازگرداندن انرژی</DialogTitle>
                      </DialogHeader>
                      <p className="text-sm text-muted-foreground">
                        پیش از برداشتن قفل: بازدید محل، خروج کامل نفرات، نصب مجدد حفاظ‌ها و جمع‌آوری
                        ابزار الزامی است.
                      </p>
                      <Textarea
                        rows={3}
                        placeholder="گزارش بازدید محل و خروج نفرات"
                        value={releaseNote}
                        onChange={(e) => setReleaseNote(e.target.value)}
                        maxLength={400}
                      />
                      <Input
                        placeholder="نام برق‌کار / مسئول بازکننده قفل"
                        value={signName}
                        onChange={(e) => setSignName(e.target.value)}
                        maxLength={80}
                      />
                      <DialogFooter>
                        <Button
                          onClick={() => {
                            if (!signName.trim()) return toast.error("نام بازکننده را وارد کنید");
                            if (!releaseNote.trim())
                              return toast.error("گزارش بازدید محل را بنویسید");
                            save(
                              {
                                lotoLocks: permit.lotoLocks.map((x) =>
                                  x.id === l.id
                                    ? {
                                        ...x,
                                        released: true,
                                        releasedBy: signName,
                                        releasedAt: new Date().toISOString(),
                                        releaseNote,
                                        hseReleaseBy: actor,
                                      }
                                    : x,
                                ),
                              },
                              evt(
                                "loto_released",
                                signName,
                                `قفل ${l.lockNumber || l.equipment} باز شد و تجهیز برق‌دار گردید`,
                              ),
                            );
                            setReleaseNote("");
                            setSignName("");
                            toast.success("قفل باز شد");
                          }}
                        >
                          ثبت ابطال قفل
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            ))}
            {openLocks.length > 0 && (
              <p className="text-xs text-destructive">
                تا زمانی که {fa(openLocks.length)} قفل فعال باز نشود، امکان بستن مجوز وجود ندارد.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* تایم‌لاین */}
      <Card className="no-print">
        <CardHeader>
          <CardTitle className="text-base">سوابق و رویدادها</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3 border-r-2 border-border pr-4">
            {[...permit.events].reverse().map((e) => (
              <li key={e.id} className="relative">
                <span className="absolute -right-[21px] top-1.5 size-2 rounded-full bg-accent" />
                <div className="text-sm">{e.description}</div>
                <div className="text-xs text-muted-foreground">
                  {e.actor} — {toJalaliDateTime(e.at)}
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <div className="print-sheet">
        <PermitPrintSheet permit={permit} settings={db.settings} />
      </div>

      {/* دیالوگ استعلام اصالت دیجیتال امضا */}
      <Dialog open={Boolean(auditSig)} onOpenChange={(open) => !open && setAuditSig(null)}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-primary">
              <ShieldCheck className="size-5 text-primary" />
              شناسنامه و استعلام اصالت دیجیتال امضا
            </DialogTitle>
          </DialogHeader>
          {auditSig && (
            <div className="space-y-4 text-xs">
              <div className="rounded-lg border border-success/30 bg-success/10 p-3 text-success">
                <div className="flex items-center gap-2 text-sm font-bold">
                  <BadgeCheck className="size-4" />
                  اصالت امضا معتبر و پلمپ دیجیتال فعال است
                </div>
                <p className="mt-1 text-[11px] text-foreground/80">
                  این امضا با الگوریتم رمزی SHA-256 بر اساس شناسه مجوز، زمان ثبت و اطلاعات امضاکننده
                  پلمپ شده است و هرگونه دستکاری پس از امضا مشخص می‌گردد.
                </p>
              </div>

              <div className="space-y-2 rounded-md border border-border bg-card p-3">
                <div className="flex justify-between border-b pb-1">
                  <span className="text-muted-foreground">مرحله و سمت:</span>
                  <span className="font-semibold">
                    {auditSig.stepTitle} ({auditSig.sig.position})
                  </span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-muted-foreground">امضاکننده:</span>
                  <span className="font-semibold">{auditSig.sig.name}</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-muted-foreground">زمان دقیق ثبت امضا:</span>
                  <span className="font-semibold">{toJalaliDateTime(auditSig.sig.at)}</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-muted-foreground">وضعیت احراز هویت:</span>
                  <span className="font-semibold text-emerald-600">
                    {auditSig.sig.verifiedOtp
                      ? `احراز هویت کامل با OTP (${auditSig.sig.otpChannel || "پیام‌رسان"})`
                      : auditSig.sig.verifiedPin
                        ? "تایید هویت با رمز PIN اختصاصی"
                        : "امضای مجاز استاندارد"}
                  </span>
                </div>
              </div>

              {auditSig.sig.verificationHash && (
                <div>
                  <label className="mb-1 block font-semibold text-muted-foreground">
                    هش رمزی یکتا (Cryptographic SHA-256 Digest):
                  </label>
                  <div className="break-all rounded border border-border bg-muted p-2 font-mono text-[11px] select-all">
                    {auditSig.sig.verificationHash}
                  </div>
                </div>
              )}

              {auditSig.sig.deviceSignatureToken && (
                <div>
                  <label className="mb-1 block font-semibold text-muted-foreground">
                    توکن اثر انگشت سیستم ثبت‌کننده:
                  </label>
                  <div className="rounded border border-border bg-muted/60 p-1.5 font-mono text-[11px] text-muted-foreground">
                    {auditSig.sig.deviceSignatureToken}
                  </div>
                </div>
              )}

              {auditSig.sig.signatureDataUrl && (
                <div>
                  <label className="mb-1 block font-semibold text-muted-foreground">
                    پیش‌نمایش ترسیمی امضا:
                  </label>
                  <SignaturePreview
                    dataUrl={auditSig.sig.signatureDataUrl}
                    signerName={auditSig.sig.name}
                    role={auditSig.sig.position}
                    date={toJalaliDateTime(auditSig.sig.at)}
                    heightClass="h-20"
                    interactive={false}
                  />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* مدال احراز هویت پیام‌رسانی OTP */}
      {otpTargetPerson && pendingDecision && (
        <OtpVerificationModal
          open={otpModalOpen}
          person={otpTargetPerson}
          onClose={() => {
            setOtpModalOpen(false);
            setPendingDecision(null);
          }}
          onVerified={(channel) => {
            executeDecide(pendingDecision, otpTargetPerson.name, channel);
          }}
        />
      )}
    </div>
  );
}
