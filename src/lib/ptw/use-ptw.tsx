import React, { createContext, useContext, useCallback, useEffect, useRef, useState } from "react";
import { loadDb, saveDb } from "./storage";
import { getSharedHandle, loadSyncPrefs, syncOnce } from "./sync";
import type { Permit, PtwDatabase, Settings } from "./types";

export interface SyncState {
  connected: boolean;
  busy: boolean;
  lastSyncAt: string | null;
  error: string | null;
}

export interface PtwContextType {
  db: PtwDatabase;
  ready: boolean;
  upsertPermit: (permit: Permit) => void;
  deletePermit: (id: string) => void;
  updateSettings: (settings: Settings) => void;
  replaceDb: (next: PtwDatabase) => void;
  sync: SyncState;
  runSync: (silent?: boolean) => Promise<void>;
}

const PtwContext = createContext<PtwContextType | null>(null);

export function PtwProvider({ children }: { children: React.ReactNode }) {
  // Load initial database state synchronously in memory for instant zero-delay tab renders
  const [db, setDb] = useState<PtwDatabase>(() => loadDb());
  const [ready, setReady] = useState(true);
  const [sync, setSync] = useState<SyncState>({
    connected: false,
    busy: false,
    lastSyncAt: null,
    error: null,
  });
  const running = useRef(false);

  useEffect(() => {
    const syncLocal = () => setDb(loadDb());
    window.addEventListener("ptw-db-changed", syncLocal);
    window.addEventListener("storage", syncLocal);
    return () => {
      window.removeEventListener("ptw-db-changed", syncLocal);
      window.removeEventListener("storage", syncLocal);
    };
  }, []);

  const commit = useCallback((next: PtwDatabase) => {
    saveDb(next);
    setDb(next);
  }, []);

  /** یک چرخه همگام‌سازی با فایل اشتراکی (ادغام امن چندکاربره) */
  const runSync = useCallback(async (silent = true) => {
    if (running.current) return;
    const handle = await getSharedHandle();
    if (!handle) {
      setSync((s) => ({ ...s, connected: false }));
      return;
    }
    running.current = true;
    setSync((s) => ({ ...s, connected: true, busy: !silent }));
    try {
      const merged = await syncOnce(loadDb());
      saveDb(merged);
      setDb(merged);
      setSync({
        connected: true,
        busy: false,
        lastSyncAt: new Date().toISOString(),
        error: null,
      });
    } catch (e) {
      setSync((s) => ({ ...s, busy: false, error: (e as Error).message }));
    } finally {
      running.current = false;
    }
  }, []);

  // همگام‌سازی خودکار دوره‌ای
  useEffect(() => {
    let timer: number | undefined;
    let cancelled = false;

    const schedule = () => {
      const prefs = loadSyncPrefs();
      const ms = Math.max(5, prefs.intervalSec) * 1000;
      timer = window.setTimeout(async () => {
        if (cancelled) return;
        if (loadSyncPrefs().auto) await runSync(true);
        schedule();
      }, ms);
    };

    void runSync(true);
    schedule();

    const onFocus = () => {
      if (loadSyncPrefs().auto) void runSync(true);
    };
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [runSync]);

  const pushAfterChange = useCallback(() => {
    if (loadSyncPrefs().auto) void runSync(true);
  }, [runSync]);

  const upsertPermit = useCallback(
    (permit: Permit) => {
      const current = loadDb();
      const exists = current.permits.some((p) => p.id === permit.id);
      const permits = exists
        ? current.permits.map((p) => (p.id === permit.id ? permit : p))
        : [permit, ...current.permits];
      commit({ ...current, permits });
      pushAfterChange();
    },
    [commit, pushAfterChange],
  );

  const deletePermit = useCallback(
    (id: string) => {
      const current = loadDb();
      commit({ ...current, permits: current.permits.filter((p) => p.id !== id) });
      pushAfterChange();
    },
    [commit, pushAfterChange],
  );

  const updateSettings = useCallback(
    (settings: Settings) => {
      const current = loadDb();
      commit({ ...current, settings, settingsUpdatedAt: new Date().toISOString() });
      pushAfterChange();
    },
    [commit, pushAfterChange],
  );

  const replaceDb = useCallback(
    (next: PtwDatabase) => {
      commit(next);
      pushAfterChange();
    },
    [commit, pushAfterChange],
  );

  return (
    <PtwContext.Provider
      value={{
        db,
        ready,
        upsertPermit,
        deletePermit,
        updateSettings,
        replaceDb,
        sync,
        runSync,
      }}
    >
      {children}
    </PtwContext.Provider>
  );
}

export function usePtwDb(): PtwContextType {
  const ctx = useContext(PtwContext);
  if (!ctx) {
    const current = loadDb();
    return {
      db: current,
      ready: true,
      upsertPermit: () => {},
      deletePermit: () => {},
      updateSettings: () => {},
      replaceDb: () => {},
      sync: { connected: false, busy: false, lastSyncAt: null, error: null },
      runSync: async () => {},
    };
  }
  return ctx;
}
