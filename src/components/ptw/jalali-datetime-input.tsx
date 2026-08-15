import { Input } from "@/components/ui/input";
import {
  JALALI_MONTHS,
  jalaliMonthLength,
  jalaliToDate,
  toJalaliParts,
  toLocalInput,
  parseSafeDate,
  fa,
} from "@/lib/ptw/date";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * ورودی تاریخ و ساعت با تقویم جلالی.
 * مقدار ورودی/خروجی همان قالب datetime-local میلادی است (YYYY-MM-DDTHH:mm).
 */
export function JalaliDateTimeInput({
  value,
  onChange,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  id?: string;
}) {
  const base = parseSafeDate(value);
  const { jy, jm, jd } = toJalaliParts(base);
  const hh = base.getHours();
  const mi = base.getMinutes();
  const time = `${String(hh).padStart(2, "0")}:${String(mi).padStart(2, "0")}`;

  const emit = (ny: number, nm: number, nd: number, t: string) => {
    const [h, m] = (t || "08:00").split(":").map((x) => Number(x) || 0);
    const maxD = jalaliMonthLength(ny, nm);
    const day = Math.min(nd, maxD);
    const dt = jalaliToDate(ny, nm, day, h, m);
    onChange(toLocalInput(dt.toISOString()));
  };

  const years = Array.from({ length: 7 }, (_, i) => jy - 1 + i);
  const days = Array.from({ length: jalaliMonthLength(jy, jm) }, (_, i) => i + 1);

  return (
    <div className="flex flex-wrap items-center gap-2" id={id}>
      <Select value={String(jd)} onValueChange={(v) => emit(jy, jm, Number(v), time)}>
        <SelectTrigger className="w-[74px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {days.map((d) => (
            <SelectItem key={d} value={String(d)}>
              {fa(d)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={String(jm)} onValueChange={(v) => emit(jy, Number(v), jd, time)}>
        <SelectTrigger className="w-[112px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {JALALI_MONTHS.map((name, i) => (
            <SelectItem key={name} value={String(i + 1)}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={String(jy)} onValueChange={(v) => emit(Number(v), jm, jd, time)}>
        <SelectTrigger className="w-[92px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {years.map((y) => (
            <SelectItem key={y} value={String(y)}>
              {fa(y)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        type="time"
        className="w-[110px]"
        value={time}
        onChange={(e) => emit(jy, jm, jd, e.target.value)}
      />
    </div>
  );
}
