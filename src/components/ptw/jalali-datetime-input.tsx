import {
  JALALI_MONTHS,
  jalaliMonthLength,
  jalaliToDate,
  toJalaliParts,
  toLocalInput,
  parseSafeDate,
  fa,
} from "@/lib/ptw/date";
import { Input } from "@/components/ui/input";

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
    const day = Math.min(Math.max(1, nd), maxD);
    const dt = jalaliToDate(ny, nm, day, h, m);
    onChange(toLocalInput(dt.toISOString()));
  };

  const years = Array.from({ length: 7 }, (_, i) => jy - 1 + i);
  const days = Array.from({ length: jalaliMonthLength(jy, jm) }, (_, i) => i + 1);

  return (
    <div className="flex flex-wrap items-center gap-2" id={id}>
      <select
        value={jd}
        onChange={(e) => emit(jy, jm, Number(e.target.value), time)}
        className="h-9 w-[76px] rounded-md border border-input bg-background px-2 py-1 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer text-center"
      >
        {days.map((d) => (
          <option key={d} value={d} className="bg-popover text-popover-foreground">
            {fa(d)}
          </option>
        ))}
      </select>

      <select
        value={jm}
        onChange={(e) => emit(jy, Number(e.target.value), jd, time)}
        className="h-9 w-[114px] rounded-md border border-input bg-background px-2 py-1 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer text-center"
      >
        {JALALI_MONTHS.map((name, i) => (
          <option key={name} value={i + 1} className="bg-popover text-popover-foreground">
            {name}
          </option>
        ))}
      </select>

      <select
        value={jy}
        onChange={(e) => emit(Number(e.target.value), jm, jd, time)}
        className="h-9 w-[94px] rounded-md border border-input bg-background px-2 py-1 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer text-center"
      >
        {years.map((y) => (
          <option key={y} value={y} className="bg-popover text-popover-foreground">
            {fa(y)}
          </option>
        ))}
      </select>

      <Input
        type="time"
        className="h-9 w-[110px]"
        value={time}
        onChange={(e) => emit(jy, jm, jd, e.target.value)}
      />
    </div>
  );
}
