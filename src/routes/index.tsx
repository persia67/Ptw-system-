import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  FilePlus2,
  ShieldAlert,
  Clock,
  Lock,
  CheckCircle2,
  PauseCircle,
  XCircle,
  Archive,
  Info,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/ptw/status-badge";
import { AboutModal } from "@/components/ptw/about-modal";
import { usePtwDb } from "@/lib/ptw/use-ptw";
import { permitTypeShort } from "@/lib/ptw/defaults";
import { toJalaliDateTime, expiresSoon, isExpired, fa } from "@/lib/ptw/date";
import { progress, effectiveSteps, currentStep, openLotoLocks } from "@/lib/ptw/workflow";
import type { Permit } from "@/lib/ptw/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "داشبورد مجوزهای کار | سامانه PTW" },
      {
        name: "description",
        content:
          "نمای کلی مجوزهای فعال، در انتظار امضا، نزدیک به انقضا، معلق و باطل‌شده در کارخانه.",
      },
      { property: "og:title", content: "داشبورد مجوزهای کار | سامانه PTW" },
      {
        property: "og:description",
        content: "نمای کلی وضعیت مجوزهای کار و قفل‌های LOTO فعال کارخانه.",
      },
    ],
  }),
  component: Dashboard,
});

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: typeof Clock;
  tone: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <span className={`flex size-10 shrink-0 items-center justify-center rounded ${tone}`}>
          <Icon className="size-5" />
        </span>
        <div>
          <div className="text-2xl font-bold leading-none">{fa(value)}</div>
          <div className="mt-1 text-xs text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function PermitRow({ permit }: { permit: Permit }) {
  const p = progress(permit);
  const step = currentStep(permit);
  const expired = permit.status === "active" && isExpired(permit.endAt);

  return (
    <Link
      to="/permits/$permitId"
      params={{ permitId: permit.id }}
      className="block rounded-md border border-border bg-card p-3 transition-colors hover:border-accent"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-bold">{permit.number}</span>
          <span className="rounded bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
            {permitTypeShort(permit.type, permit.customTypeTitle)}
          </span>
          {permit.hasLoto && openLotoLocks(permit).length > 0 && (
            <span className="flex items-center gap-1 rounded bg-destructive/15 px-2 py-0.5 text-xs text-destructive">
              <Lock className="size-3" />
              {fa(openLotoLocks(permit).length)} قفل فعال
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {expired && (
            <span className="rounded bg-destructive/15 px-2 py-0.5 text-xs text-destructive">
              منقضی شده
            </span>
          )}
          {permit.status === "active" && !expired && expiresSoon(permit.endAt) && (
            <span className="rounded bg-warning/20 px-2 py-0.5 text-xs text-warning-foreground">
              نزدیک به انقضا
            </span>
          )}
          <StatusBadge status={permit.status} />
        </div>
      </div>
      <p className="mt-2 line-clamp-1 text-sm text-foreground">{permit.description}</p>
      <div className="mt-1 text-xs text-muted-foreground">
        {permit.unit} — {permit.location} | اعتبار تا {toJalaliDateTime(permit.endAt)}
      </div>
      {permit.status === "pending" && (
        <div className="mt-2 space-y-1">
          <Progress value={p.percent} className="h-1.5" />
          <div className="text-xs text-muted-foreground">
            مرحله جاری: {step?.title ?? "—"} ({fa(p.done)} از {fa(p.total)} امضا)
          </div>
        </div>
      )}
    </Link>
  );
}

function Dashboard() {
  const { db, ready } = usePtwDb();
  const [aboutOpen, setAboutOpen] = useState(false);

  const stats = useMemo(() => {
    const ps = db.permits;
    return {
      active: ps.filter((p) => p.status === "active").length,
      pending: ps.filter((p) => p.status === "pending").length,
      expiring: ps.filter((p) => p.status === "active" && expiresSoon(p.endAt)).length,
      suspended: ps.filter((p) => p.status === "suspended").length,
      cancelled: ps.filter((p) => p.status === "cancelled").length,
      closed: ps.filter((p) => p.status === "closed").length,
      locks: ps.reduce((n, p) => n + openLotoLocks(p).length, 0),
    };
  }, [db.permits]);

  const pending = db.permits.filter((p) => p.status === "pending");
  const active = db.permits.filter((p) => p.status === "active" || p.status === "suspended");
  const drafts = db.permits.filter((p) => p.status === "draft");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">داشبورد مجوزهای کار</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {db.settings.companyName} — {db.settings.plantName}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAboutOpen(true)}
            className="gap-1.5 border-primary/30"
          >
            <Info className="size-4 text-primary" />
            درباره و به‌روزرسانی‌ها
          </Button>
          <Button asChild size="lg">
            <Link to="/permits/new" preload={false}>
              <FilePlus2 className="size-4" />
              صدور مجوز جدید
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        <StatCard
          label="مجوز فعال"
          value={stats.active}
          icon={CheckCircle2}
          tone="bg-success/15 text-success"
        />
        <StatCard
          label="در انتظار امضا"
          value={stats.pending}
          icon={Clock}
          tone="bg-warning/20 text-warning-foreground"
        />
        <StatCard
          label="نزدیک به انقضا"
          value={stats.expiring}
          icon={ShieldAlert}
          tone="bg-accent/25 text-accent-foreground"
        />
        <StatCard
          label="قفل LOTO فعال"
          value={stats.locks}
          icon={Lock}
          tone="bg-destructive/15 text-destructive"
        />
        <StatCard
          label="معلق"
          value={stats.suspended}
          icon={PauseCircle}
          tone="bg-info/15 text-info"
        />
        <StatCard
          label="باطل شده"
          value={stats.cancelled}
          icon={XCircle}
          tone="bg-destructive/15 text-destructive"
        />
        <StatCard
          label="بایگانی شده"
          value={stats.closed}
          icon={Archive}
          tone="bg-secondary text-secondary-foreground"
        />
      </div>

      {ready && db.permits.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <ShieldAlert className="size-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              هنوز هیچ مجوز کاری ثبت نشده است. اولین مجوز را صادر کنید.
            </p>
            <Button asChild>
              <Link to="/permits/new" preload={false}>
                صدور اولین مجوز
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {pending.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">در انتظار تایید و امضا</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pending.map((p) => (
              <PermitRow key={p.id} permit={p} />
            ))}
          </CardContent>
        </Card>
      )}

      {active.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">مجوزهای فعال و معلق</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {active.map((p) => (
              <PermitRow key={p.id} permit={p} />
            ))}
          </CardContent>
        </Card>
      )}

      {drafts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">پیش‌نویس‌ها</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {drafts.map((p) => (
              <PermitRow key={p.id} permit={p} />
            ))}
          </CardContent>
        </Card>
      )}

      {db.permits.length > 0 && (
        <p className="text-xs text-muted-foreground">
          مجموع مراحل تعریف‌شده در گردش کار: {fa(effectiveSteps(db.permits[0]).length)} مرحله برای
          آخرین مجوز ثبت‌شده.
        </p>
      )}

      <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </div>
  );
}
