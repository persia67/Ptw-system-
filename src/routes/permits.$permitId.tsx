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
import { PermitPrintSheet } from "@/components/ptw/permit-print";
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
import type { Permit } from "@/lib/ptw/types";

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

  const decide = (decision: "approved" | "rejected") => {
    if (!step) return;
    if (!signName.trim()) return toast.error("نام امضاکننده را وارد کنید");
    if (decision === "rejected" && !signComment.trim()) return toast.error("دلیل رد را بنویسید");

    const signature = {
      stepId: step.id,
      decision,
      name: signName.trim(),
      position: step.roleTitle,
      comment: signComment.trim() || undefined,
      signatureDataUrl: signData,
      at: new Date().toISOString(),
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
          finished ? "تمام تاییدها انجام شد و مجوز صادر گردید" : `مرحله «${step.title}» تایید شد`,
        ),
      );
      toast.success(finished ? "مجوز صادر شد" : "امضا ثبت شد");
    }
    setSignName("");
    setSignComment("");
    setSignData(undefined);
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
            <ol className="space-y-2">
              {steps.map((s, i) => {
                const sig = permit.signatures.find((x) => x.stepId === s.id);
                const isCurrent = i === permit.currentStepIndex && permit.status === "pending";
                return (
                  <li
                    key={s.id}
                    className={`rounded-md border p-3 ${
                      isCurrent
                        ? "border-accent bg-accent/10"
                        : sig?.decision === "approved"
                          ? "border-success/40 bg-success/5"
                          : sig?.decision === "rejected"
                            ? "border-destructive/40 bg-destructive/5"
                            : "border-border"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-bold">
                          {fa(i + 1)}. {s.title}
                        </div>
                        <div className="text-xs text-muted-foreground">{s.roleTitle}</div>
                      </div>
                      {sig ? (
                        <div className="text-xs">
                          <span
                            className={
                              sig.decision === "approved" ? "text-success" : "text-destructive"
                            }
                          >
                            {sig.decision === "approved" ? "تایید شد" : "رد شد"}
                          </span>{" "}
                          — {sig.name} — {toJalaliDateTime(sig.at)}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">در انتظار</span>
                      )}
                    </div>
                    {sig?.comment && (
                      <p className="mt-1 text-xs text-muted-foreground">توضیح: {sig.comment}</p>
                    )}
                    {sig?.signatureDataUrl && (
                      <img
                        src={sig.signatureDataUrl}
                        alt={`امضای ${sig.name}`}
                        className="mt-2 h-12 object-contain"
                      />
                    )}
                  </li>
                );
              })}
            </ol>

            {permit.status === "pending" && step && (
              <>
                <Separator />
                <div className="space-y-3 rounded-md border border-accent/50 bg-accent/5 p-3">
                  <div className="text-sm font-bold">
                    امضای مرحله جاری: {step.title} ({step.roleTitle})
                  </div>
                  {step.id === "electrical" && openLocks.length === 0 && permit.hasLoto && (
                    <p className="text-xs text-destructive">
                      هیچ قفل فعالی ثبت نشده است؛ پیش از تایید، قفل و برچسب را اعمال کنید.
                    </p>
                  )}
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <Label>نام و نام خانوادگی امضاکننده</Label>
                      <Input
                        value={signName}
                        onChange={(e) => setSignName(e.target.value)}
                        maxLength={80}
                      />
                    </div>
                    <div>
                      <Label>توضیح / دلیل (در صورت رد الزامی)</Label>
                      <Input
                        value={signComment}
                        onChange={(e) => setSignComment(e.target.value)}
                        maxLength={300}
                      />
                    </div>
                  </div>
                  <SignaturePad value={signData} onChange={setSignData} />
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => decide("approved")}>
                      <CheckCircle2 className="size-4" />
                      تایید و امضا
                    </Button>
                    <Button variant="destructive" onClick={() => decide("rejected")}>
                      <XCircle className="size-4" />
                      رد و بازگشت به مرحله قبل
                    </Button>
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
    </div>
  );
}
