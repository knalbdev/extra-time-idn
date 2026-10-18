"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { EskulKey } from "@/lib/types";
import { ESKUL_ORDER } from "@/lib/constants";

type Settings = { enabledEskuls: EskulKey[]; available: boolean; setEnabled: (keys: EskulKey[]) => void; refreshEnabled: () => Promise<EskulKey[]> };
const Context = createContext<Settings | null>(null);
export function useExtracurriculars() {
  const value = useContext(Context);
  if (!value) throw new Error("ExtracurricularProvider is required");
  return value;
}
export function ExtracurricularProvider({ initial, available, children }: { initial: EskulKey[]; available: boolean; children: React.ReactNode }) {
  const [enabledEskuls, setEnabledEskuls] = useState(initial);
  const [unavailable, setUnavailable] = useState(!available);
  const revision = useRef(0);
  const setEnabled = useCallback((keys: EskulKey[]) => {
    revision.current++;
    setEnabledEskuls(previous => previous.join() === keys.join() ? previous : keys);
    setUnavailable(false);
  }, []);
  const refreshEnabled = useCallback(async () => {
    const requestRevision = ++revision.current;
    try {
      const response = await fetch("/api/extracurriculars", { cache: "no-store", signal: AbortSignal.timeout(10000) });
      const data = await response.json();
      if (!response.ok || !Array.isArray(data.enabled)) throw new Error("Daftar ekstrakurikuler belum dapat diperbarui.");
      const keys = ESKUL_ORDER.filter(key => data.enabled.includes(key));
      if (requestRevision === revision.current) setEnabled(keys);
      return keys;
    } catch (error) {
      // Never restore stale schedules for an activity that may have been paused.
      if (requestRevision === revision.current) {
        setEnabledEskuls(previous => previous.length ? [] : previous);
        setUnavailable(true);
      }
      throw error;
    }
  }, [setEnabled]);
  useEffect(() => {
    const update = () => { if (document.visibilityState === "visible") void refreshEnabled().catch(() => {}); };
    const timer = window.setInterval(update, 30000);
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", update); document.removeEventListener("visibilitychange", update); };
  }, [refreshEnabled]);
  return <Context.Provider value={{ enabledEskuls, available: !unavailable, setEnabled, refreshEnabled }}>
    {unavailable && <div role="alert" className="print-hide border-b border-amber-200 bg-amber-50 px-4 py-3 text-center text-xs text-amber-900">Daftar ekstrakurikuler belum dapat dimuat. <button className="font-semibold underline" onClick={() => void refreshEnabled().catch(() => {})}>Coba kembali</button></div>}
    {children}
  </Context.Provider>;
}
