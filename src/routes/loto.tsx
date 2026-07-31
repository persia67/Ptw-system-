import { createFileRoute, Link } from "@tanstack/react-router";
import { Lock, Unlock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePtwDb } from "@/lib/ptw/use-ptw";
import { toJalaliDateTime, fa } from "@/lib/ptw/date";

export const Route = createFileRoute("/loto")({
  head: () => ({
    meta: [
      { title: "قفل و برچسب فعال (LOTO) | سامانه PTW" },
      {
        name: "description",
        content: "فهرست تمام قفل‌های LOTO فعال و باز شده روی تجهیزات کارخانه.",
      },
      { property: "og:title", content: "قفل و برچسب فعال (LOTO) | سامانه PTW" },
      { property: "og:description", content: "پایش قفل‌های ایزولاسیون انرژی تجهیزات." },
    ],
  }),
  component: LotoPage,
});

function LotoPage() {
  const { db } = usePtwDb();
  const rows = db.permits.flatMap((p) => p.lotoLocks.map((l) => ({ permit: p, lock: l })));
  const open = rows.filter((r) => !r.lock.released);
  const released = rows.filter((r) => r.lock.released);

  const Row = ({ permit, lock }: (typeof rows)[number]) => (
    <Link
      to="/permits/$permitId"
      params={{ permitId: permit.id }}
      className={`block rounded-md border p-3 transition-colors hover:border-accent ${
        lock.released ? "border-border bg-muted/40" : "border-destructive/40"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-bold">
          {lock.equipment || "تجهیز نامشخص"} — قفل {lock.lockNumber || "—"}
        </span>
        <span className="font-mono text-xs">{permit.number}</span>
      </div>
      <div className="mt-1 text-xs text-muted-foreground">
        {permit.unit} | منابع انرژی: {lock.energySources.join("، ") || "—"} | قفل‌گذار:{" "}
        {lock.appliedBy || "—"} | اعمال: {toJalaliDateTime(lock.appliedAt)}
        {lock.released && ` | باز شده: ${toJalaliDateTime(lock.releasedAt)}`}
      </div>
    </Link>
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">قفل و برچسب (LOTO)</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {fa(open.length)} قفل فعال و {fa(released.length)} قفل باز شده ثبت شده است.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="size-4 text-destructive" />
            قفل‌های فعال
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {open.length === 0 && (
            <p className="text-sm text-muted-foreground">هیچ قفل فعالی وجود ندارد.</p>
          )}
          {open.map((r) => (
            <Row key={r.lock.id} {...r} />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Unlock className="size-4" />
            قفل‌های باز شده
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {released.length === 0 && (
            <p className="text-sm text-muted-foreground">موردی ثبت نشده است.</p>
          )}
          {released.map((r) => (
            <Row key={r.lock.id} {...r} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
