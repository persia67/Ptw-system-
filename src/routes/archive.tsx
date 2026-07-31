import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/ptw/status-badge";
import { usePtwDb } from "@/lib/ptw/use-ptw";
import { PERMIT_TYPES, STATUS_LABEL, permitTypeShort } from "@/lib/ptw/defaults";
import { exportCsv, exportDb } from "@/lib/ptw/storage";
import { toJalaliDateTime, fa } from "@/lib/ptw/date";

export const Route = createFileRoute("/archive")({
  head: () => ({
    meta: [
      { title: "بایگانی مجوزهای کار | سامانه PTW" },
      {
        name: "description",
        content: "جستجو و فیلتر بایگانی مجوزهای کار و برون‌بری خروجی اکسل و پشتیبان.",
      },
      { property: "og:title", content: "بایگانی مجوزهای کار | سامانه PTW" },
      { property: "og:description", content: "آرشیو کامل مجوزهای صادرشده، باطل‌شده و بسته‌شده." },
    ],
  }),
  component: ArchivePage,
});

function ArchivePage() {
  const { db } = usePtwDb();
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [unit, setUnit] = useState("all");

  const list = useMemo(
    () =>
      db.permits.filter((p) => {
        const text = `${p.number} ${p.description} ${p.location} ${p.contractor} ${p.supervisorName}`;
        if (q && !text.includes(q)) return false;
        if (type !== "all" && p.type !== type) return false;
        if (status !== "all" && p.status !== status) return false;
        if (unit !== "all" && p.unit !== unit) return false;
        return true;
      }),
    [db.permits, q, type, status, unit],
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">بایگانی مجوزها</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {fa(list.length)} مجوز از مجموع {fa(db.permits.length)} مورد نمایش داده می‌شود.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => exportCsv(list)}>
            <Download className="size-4" />
            خروجی اکسل (CSV)
          </Button>
          <Button variant="outline" onClick={() => exportDb(db)}>
            <Download className="size-4" />
            فایل پشتیبان کامل
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-4">
          <div className="relative">
            <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="جستجو در شماره، شرح کار، محل…"
              className="pr-9"
            />
          </div>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger>
              <SelectValue placeholder="نوع مجوز" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه انواع</SelectItem>
              {PERMIT_TYPES.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.short}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue placeholder="وضعیت" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه وضعیت‌ها</SelectItem>
              {Object.entries(STATUS_LABEL).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={unit} onValueChange={setUnit}>
            <SelectTrigger>
              <SelectValue placeholder="واحد" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه واحدها</SelectItem>
              {db.settings.units.map((u) => (
                <SelectItem key={u} value={u}>
                  {u}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {list.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              موردی مطابق فیلترها یافت نشد.
            </CardContent>
          </Card>
        )}
        {list.map((p) => (
          <Link
            key={p.id}
            to="/permits/$permitId"
            params={{ permitId: p.id }}
            className="block rounded-md border border-border bg-card p-3 transition-colors hover:border-accent"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold">{p.number}</span>
                <span className="rounded bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                  {permitTypeShort(p.type, p.customTypeTitle)}
                </span>
              </div>
              <StatusBadge status={p.status} />
            </div>
            <p className="mt-1 line-clamp-1 text-sm">{p.description}</p>
            <div className="mt-1 text-xs text-muted-foreground">
              {p.unit} — {p.location} | {toJalaliDateTime(p.startAt)} تا {toJalaliDateTime(p.endAt)}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
