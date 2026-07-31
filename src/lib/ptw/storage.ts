import { DEFAULT_SETTINGS } from "./defaults";
import type { PtwDatabase, Permit, Settings } from "./types";

const KEY = "ptw-db-v1";

export const emptyDb = (): PtwDatabase => ({
  version: 1,
  permits: [],
  settings: DEFAULT_SETTINGS,
});

export function loadDb(): PtwDatabase {
  if (typeof window === "undefined") return emptyDb();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return emptyDb();
    const parsed = JSON.parse(raw) as PtwDatabase;
    return {
      version: 1,
      permits: Array.isArray(parsed.permits) ? parsed.permits : [],
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) } as Settings,
      settingsUpdatedAt: parsed.settingsUpdatedAt,
    };
  } catch {
    return emptyDb();
  }
}

export function saveDb(db: PtwDatabase) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(db));
  window.dispatchEvent(new CustomEvent("ptw-db-changed"));
}

export function exportDb(db: PtwDatabase) {
  const blob = new Blob([JSON.stringify(db, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ptw-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportCsv(permits: Permit[]) {
  const head = [
    "شماره مجوز",
    "نوع",
    "واحد",
    "محل",
    "شرح کار",
    "پیمانکار",
    "شروع",
    "پایان",
    "وضعیت",
  ];
  const rows = permits.map((p) => [
    p.number,
    p.type,
    p.unit,
    p.location,
    p.description.replace(/\n/g, " "),
    p.contractor,
    p.startAt,
    p.endAt,
    p.status,
  ]);
  const csv = [head, ...rows]
    .map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ptw-archive-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importDbFromFile(file: File): Promise<PtwDatabase> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as PtwDatabase;
        if (!parsed || !Array.isArray(parsed.permits)) throw new Error("bad");
        resolve({
          version: 1,
          permits: parsed.permits,
          settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
        });
      } catch {
        reject(new Error("فایل پشتیبان معتبر نیست"));
      }
    };
    reader.onerror = () => reject(new Error("خواندن فایل ناموفق بود"));
    reader.readAsText(file);
  });
}
