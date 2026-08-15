const faDate = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const faDateTime = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const faLong = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
});

export function parseSafeDate(v?: string | Date | null): Date {
  if (!v) return new Date();
  if (v instanceof Date) return isNaN(v.getTime()) ? new Date() : v;
  const d = new Date(v);
  if (!isNaN(d.getTime())) return d;
  if (typeof v === "string" && v.includes("T") && v.length === 16) {
    const d2 = new Date(v + ":00");
    if (!isNaN(d2.getTime())) return d2;
  }
  return new Date();
}

export const toJalali = (iso?: string) => (iso ? faDate.format(parseSafeDate(iso)) : "—");
export const toJalaliDateTime = (iso?: string) =>
  iso ? faDateTime.format(parseSafeDate(iso)).replace("،", " —") : "—";
export const toJalaliLong = (iso?: string) => (iso ? faLong.format(parseSafeDate(iso)) : "—");

export const jalaliYear = (d: Date | string = new Date()) => {
  const dateObj = parseSafeDate(d);
  return Number(
    new Intl.DateTimeFormat("en-u-ca-persian", { year: "numeric" })
      .format(dateObj)
      .replace(/[^0-9]/g, ""),
  );
};

/** تبدیل ISO به مقدار مناسب input[type=datetime-local] */
export const toLocalInput = (iso?: string) => {
  if (!iso) return "";
  const d = parseSafeDate(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const fromLocalInput = (v: string) => {
  if (!v) return "";
  const d = parseSafeDate(v);
  return d.toISOString();
};

export const hoursBetween = (a: string, b: string) =>
  (parseSafeDate(b).getTime() - parseSafeDate(a).getTime()) / 36e5;

export const isExpired = (endAt: string) => parseSafeDate(endAt).getTime() < Date.now();

export const expiresSoon = (endAt: string, withinHours = 4) => {
  const diff = (parseSafeDate(endAt).getTime() - Date.now()) / 36e5;
  return diff > 0 && diff <= withinHours;
};

const faDigits = "۰۱۲۳۴۵۶۷۸۹";
export const fa = (n: number | string) => String(n).replace(/[0-9]/g, (d) => faDigits[Number(d)]);

/* ---------- تبدیل تقویم میلادی <-> جلالی (الگوریتم jalaali) ---------- */

const div = (a: number, b: number) => Math.floor(a / b);
const mod = (a: number, b: number) => a - Math.floor(a / b) * b;

function jalCal(jy: number) {
  const breaks = [
    -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 1701, 1745, 1762, 1793, 1817, 1856,
    1911, 1988, 2014, 2456, 3178,
  ];
  const bl = breaks.length;
  const gy = jy + 621;
  let leapJ = -14;
  let jp = breaks[0];
  let jump = 0;
  for (let i = 1; i < bl; i += 1) {
    const jm = breaks[i];
    jump = jm - jp;
    if (jy < jm) break;
    leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }
  let n = jy - jp;
  leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;
  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;
  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
  let leap = mod(mod(n + 1, 33) - 1, 4);
  if (leap === -1) leap = 4;
  return { leap, gy, march };
}

const g2d = (gy: number, gm: number, gd: number) => {
  let d =
    div((gy + div(gm - 8, 6) + 100100) * 1461, 4) +
    div(153 * mod(gm + 9, 12) + 2, 5) +
    gd -
    34840408;
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
  return d;
};

const d2g = (jdn: number) => {
  let j = 4 * jdn + 139361631;
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(mod(j, 1461), 4) * 5 + 308;
  const gd = div(mod(i, 153), 5) + 1;
  const gm = mod(div(i, 153), 12) + 1;
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
  return { gy, gm, gd };
};

export function toJalaliParts(date: Date) {
  const jdn = g2d(date.getFullYear(), date.getMonth() + 1, date.getDate());
  const gy = date.getFullYear();
  let jy = gy - 621;
  const r = jalCal(jy);
  const jdn1f = g2d(gy, 3, r.march);
  let k = jdn - jdn1f;
  if (k >= 0) {
    if (k <= 185) return { jy, jm: 1 + div(k, 31), jd: mod(k, 31) + 1 };
    k -= 186;
  } else {
    jy -= 1;
    k += 179;
    if (jalCal(jy).leap === 1) k += 1;
  }
  return { jy, jm: 7 + div(k, 30), jd: mod(k, 30) + 1 };
}

export function jalaliToDate(jy: number, jm: number, jd: number, hh = 0, mi = 0) {
  const r = jalCal(jy);
  const jdn = g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
  const g = d2g(jdn);
  return new Date(g.gy, g.gm - 1, g.gd, hh, mi, 0, 0);
}

export const jalaliMonthLength = (jy: number, jm: number) =>
  jm <= 6 ? 31 : jm <= 11 ? 30 : jalCal(jy).leap === 1 ? 30 : 29;

export const JALALI_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];
