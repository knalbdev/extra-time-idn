"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ESKUL_ORDER } from "@/lib/constants";
import { isoToday, monthKey, monthLabel } from "@/lib/format";
import { getAllEvents } from "@/lib/sheets";
import { EskulEvent, EskulKey, ScheduleResponse } from "@/lib/types";
import { CursorGlow } from "./CursorGlow";
import { DashboardView } from "./DashboardView";
import { ReportView } from "./ReportView";
import { MonthOption } from "./ScheduleFilters";
import { ScheduleView } from "./ScheduleView";
import { Sidebar, View } from "./Sidebar";
import { Topbar } from "./Topbar";

const CACHE_KEY = "extratime:schedule-cache:v1";

function readCache(): ScheduleResponse | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as ScheduleResponse) : null;
  } catch {
    return null;
  }
}

function writeCache(data: ScheduleResponse) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // localStorage may be unavailable (e.g. private mode); ignore.
  }
}

export function ScheduleApp({ onGoHome }: { onGoHome?: () => void }) {
  const [events, setEvents] = useState<EskulEvent[]>([]);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [view, setView] = useState<View>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);

  const [selectedMonth, setSelectedMonth] = useState(() => monthKey(isoToday()));
  const [selectedClass, setSelectedClass] = useState("all");
  const [activeEskuls, setActiveEskuls] = useState<Set<EskulKey>>(
    () => new Set(ESKUL_ORDER),
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const freshEvents = await getAllEvents();
      const data: ScheduleResponse = {
        events: freshEvents,
        fetchedAt: new Date().toISOString(),
      };
      setEvents(data.events);
      setFetchedAt(data.fetchedAt);
      writeCache(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat data jadwal.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Paint instantly from the last cached fetch (if any) while a fresh
    // fetch runs in the background; `load` also powers the manual refresh button.
    const cached = readCache();
    if (cached) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEvents(cached.events);
      setFetchedAt(cached.fetchedAt);
    }
    load();
  }, [load]);

  const months: MonthOption[] = useMemo(() => {
    const keys = new Set(events.map((e) => monthKey(e.date)));
    return Array.from(keys)
      .sort()
      .map((key) => ({ key, label: monthLabel(key) }));
  }, [events]);

  // If the default (current) month has no scheduled events in this data set,
  // fall back to the closest upcoming month instead of showing an empty list.
  // Adjusted during render (not in an effect), per
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const monthsSignature = months.map((m) => m.key).join("|");
  const [checkedMonthsSignature, setCheckedMonthsSignature] = useState("");
  if (
    monthsSignature !== checkedMonthsSignature &&
    months.length > 0 &&
    selectedMonth !== "all" &&
    !months.some((m) => m.key === selectedMonth)
  ) {
    setCheckedMonthsSignature(monthsSignature);
    const closest = months.find((m) => m.key >= selectedMonth) ?? months[0];
    setSelectedMonth(closest.key);
  } else if (monthsSignature !== checkedMonthsSignature && months.length > 0) {
    setCheckedMonthsSignature(monthsSignature);
  }

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (selectedMonth !== "all" && monthKey(e.date) !== selectedMonth) return false;
      if (selectedClass !== "all" && !e.classes.includes(selectedClass)) return false;
      if (!activeEskuls.has(e.eskul)) return false;
      return true;
    });
  }, [events, selectedMonth, selectedClass, activeEskuls]);

  const toggleEskul = useCallback((eskul: EskulKey) => {
    setActiveEskuls((prev) => {
      const next = new Set(prev);
      if (next.has(eskul)) {
        if (next.size === 1) return next; // keep at least one active
        next.delete(eskul);
      } else {
        next.add(eskul);
      }
      return next;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setSelectedMonth("all");
    setSelectedClass("all");
    setActiveEskuls(new Set(ESKUL_ORDER));
  }, []);

  return (
    <div className="flex min-h-screen bg-surface">
      <CursorGlow darkZoneRef={sidebarRef} />

      <Sidebar
        ref={sidebarRef}
        active={view}
        onNavigate={setView}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onGoHome={onGoHome}
      />

      <div className="min-w-0 flex-1">
        <Topbar
          fetchedAt={fetchedAt}
          loading={loading}
          onRefresh={load}
          onMenuClick={() => setSidebarOpen(true)}
        />

        <main className="mx-auto w-full max-w-[1400px] flex-1 flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
          {error && (
            <div className="mb-6 flex items-center justify-between gap-3 rounded-lg border border-error-container bg-error-container/40 px-4 py-3 text-sm text-error">
              <span>{error}</span>
              <button
                type="button"
                onClick={load}
                className="shrink-0 rounded-md bg-error px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
              >
                Coba Lagi
              </button>
            </div>
          )}

          {loading && events.length === 0 && !error ? (
            <div className="space-y-6">
              <div className="h-40 animate-shimmer rounded-xl" />
              <div className="h-24 animate-shimmer rounded-xl" />
              <div className="h-96 animate-shimmer rounded-xl" />
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={view}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              >
                {view === "dashboard" ? (
                  <DashboardView events={events} />
                ) : view === "laporan" ? (
                  <ReportView events={events} />
                ) : (
                  <ScheduleView
                    events={events}
                    filteredEvents={filteredEvents}
                    months={months}
                    selectedMonth={selectedMonth}
                    onMonthChange={setSelectedMonth}
                    selectedClass={selectedClass}
                    onClassChange={setSelectedClass}
                    activeEskuls={activeEskuls}
                    onToggleEskul={toggleEskul}
                    onClearFilters={clearFilters}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </main>

        <footer className="border-t border-outline-variant/50 bg-white/60">
          <div className="mx-auto flex max-w-[1400px] flex-col items-center gap-2 px-4 py-8 text-center md:px-8">
            <p className="text-xs text-on-surface-variant/70">&copy; IDN Akhwat 2026</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
