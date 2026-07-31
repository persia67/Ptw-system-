import { DEFAULT_SETTINGS } from "./defaults";
import type { PtwDatabase, Permit } from "./types";

/**
 * همگام‌سازی با یک «فایل اشتراکی» روی درایو شبکه/اشتراکی.
 * از File System Access API استفاده می‌کند (Chrome / Edge روی ویندوز).
 * چند کاربر می‌توانند هم‌زمان کار کنند: پیش از هر نوشتن، فایل دوباره خوانده و
 * با داده محلی ادغام می‌شود (آخرین ویرایش هر پرمیت برنده است) و نوشتن‌ها در یک
 * صف ترتیبی انجام می‌شود تا فایل خراب نشود.
 */

const DB_NAME = "ptw-sync";
const STORE = "handles";
const HANDLE_KEY = "shared-file";
const PREF_KEY = "ptw-sync-prefs-v1";

export interface SyncPrefs {
  auto: boolean;
  intervalSec: number;
  fileName: string | null;
  hintPath: string;
}

export const DEFAULT_SYNC_PREFS: SyncPrefs = {
  auto: true,
  intervalSec: 15,
  fileName: null,
  hintPath: "",
};

export const isSyncSupported = () =>
  typeof window !== "undefined" && "showSaveFilePicker" in window;

export function loadSyncPrefs(): SyncPrefs {
  if (typeof window === "undefined") return DEFAULT_SYNC_PREFS;
  try {
    const raw = window.localStorage.getItem(PREF_KEY);
    if (!raw) return DEFAULT_SYNC_PREFS;
    return { ...DEFAULT_SYNC_PREFS, ...(JSON.parse(raw) as Partial<SyncPrefs>) };
  } catch {
    return DEFAULT_SYNC_PREFS;
  }
}

export function saveSyncPrefs(prefs: SyncPrefs) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
  window.dispatchEvent(new CustomEvent("ptw-sync-prefs-changed"));
}

/* ---------- نگهداری دسترسی فایل در IndexedDB ---------- */

function idb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key: string, value: unknown) {
  const db = await idb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function idbGet<T>(key: string): Promise<T | null> {
  const db = await idb();
  const out = await new Promise<T | null>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve((req.result as T) ?? null);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return out;
}

async function idbDelete(key: string) {
  const db = await idb();
  await new Promise<void>((resolve) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => resolve();
  });
  db.close();
}

/* ---------- دسترسی به فایل ---------- */

type FileHandle = FileSystemFileHandle;

export async function getSharedHandle(): Promise<FileHandle | null> {
  if (typeof window === "undefined" || !("indexedDB" in window)) return null;
  try {
    return await idbGet<FileHandle>(HANDLE_KEY);
  } catch {
    return null;
  }
}

async function ensurePermission(handle: FileHandle, write: boolean) {
  const opts = { mode: write ? "readwrite" : "read" } as { mode: "readwrite" | "read" };
  // @ts-expect-error - permission APIs are not in all TS lib versions
  const q = await handle.queryPermission?.(opts);
  if (q === "granted") return true;
  // @ts-expect-error - permission APIs are not in all TS lib versions
  const r = await handle.requestPermission?.(opts);
  return r === "granted";
}

export async function pickSharedFile(create: boolean): Promise<FileHandle> {
  const w = window as unknown as {
    showSaveFilePicker: (o: unknown) => Promise<FileHandle>;
    showOpenFilePicker: (o: unknown) => Promise<FileHandle[]>;
  };
  const types = [{ description: "PTW Shared Database", accept: { "application/json": [".json"] } }];
  const handle = create
    ? await w.showSaveFilePicker({ suggestedName: "ptw-shared.json", types })
    : (await w.showOpenFilePicker({ types, multiple: false }))[0];
  await ensurePermission(handle, true);
  await idbSet(HANDLE_KEY, handle);
  return handle;
}

export async function forgetSharedFile() {
  await idbDelete(HANDLE_KEY);
}

/* ---------- ادغام ---------- */

const ts = (v?: string) => (v ? Date.parse(v) || 0 : 0);

export function mergeDb(local: PtwDatabase, remote: PtwDatabase | null): PtwDatabase {
  if (!remote) return local;
  const map = new Map<string, Permit>();
  for (const p of remote.permits ?? []) map.set(p.id, p);
  for (const p of local.permits ?? []) {
    const other = map.get(p.id);
    if (!other || ts(p.updatedAt) >= ts(other.updatedAt)) map.set(p.id, p);
  }
  const permits = [...map.values()].sort((a, b) => ts(b.createdAt) - ts(a.createdAt));

  const useRemoteSettings = ts(remote.settingsUpdatedAt) > ts(local.settingsUpdatedAt);
  return {
    version: 1,
    permits,
    settings: {
      ...DEFAULT_SETTINGS,
      ...((useRemoteSettings ? remote.settings : local.settings) ?? DEFAULT_SETTINGS),
    },
    settingsUpdatedAt: useRemoteSettings ? remote.settingsUpdatedAt : local.settingsUpdatedAt,
  };
}

/* ---------- خواندن / نوشتن با صف ترتیبی ---------- */

let queue: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const next = queue.then(task, task);
  queue = next.catch(() => undefined);
  return next;
}

async function readFile(handle: FileHandle): Promise<PtwDatabase | null> {
  const file = await handle.getFile();
  const text = await file.text();
  if (!text.trim()) return null;
  const parsed = JSON.parse(text) as PtwDatabase;
  if (!parsed || !Array.isArray(parsed.permits)) return null;
  return parsed;
}

/**
 * یک چرخه همگام‌سازی: خواندن فایل اشتراکی، ادغام با داده محلی و نوشتن نتیجه.
 * خروجی، پایگاه‌داده ادغام‌شده است.
 */
export async function syncOnce(local: PtwDatabase): Promise<PtwDatabase> {
  const handle = await getSharedHandle();
  if (!handle) return local;
  return enqueue(async () => {
    if (!(await ensurePermission(handle, true))) {
      throw new Error("دسترسی به فایل اشتراکی تایید نشد");
    }
    let remote: PtwDatabase | null = null;
    try {
      remote = await readFile(handle);
    } catch {
      throw new Error("فایل اشتراکی قابل خواندن نیست (ممکن است در حال نوشتن باشد)");
    }
    const merged = mergeDb(local, remote);
    const writable = await handle.createWritable();
    await writable.write(JSON.stringify(merged, null, 2));
    await writable.close();
    return merged;
  });
}

/** فقط خواندن (بدون نوشتن) — برای بررسی وضعیت فایل */
export async function pullOnce(local: PtwDatabase): Promise<PtwDatabase> {
  const handle = await getSharedHandle();
  if (!handle) return local;
  return enqueue(async () => {
    if (!(await ensurePermission(handle, false))) {
      throw new Error("دسترسی به فایل اشتراکی تایید نشد");
    }
    return mergeDb(local, await readFile(handle));
  });
}
