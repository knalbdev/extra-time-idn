"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ESKUL_ORDER } from "@/lib/constants";
import { isoToday, monthKey, monthLabel } from "@/lib/format";
import { EskulEvent, EskulKey, ScheduleResponse } from "@/lib/types";
import { Header } from "./Header";
import { WeekHighlight } from "./WeekHighlight";
import { Filters, MonthOption } from "./Filters";
import { ScheduleList } from "./ScheduleList";

export function ScheduleApp() {
  const [events, setEvents] = useState<EskulEvent[]>([]);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedMonth, setSelectedMonth] = useState(() => monthKey(isoToday()));
  const [selectedClass, setSelectedClass] = useState("all");
  const [activeEskuls, setActiveEskuls] = useState<Set<EskulKey>>(
    () => new Set(ESKUL_ORDER),
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/schedule", { cache: "no-store" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || `Gagal memuat data (status ${res.status})`);
      }
      const data: ScheduleResponse = await res.json();
      setEvents(data.events);
      setFetchedAt(data.fetchedAt);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat data jadwal.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial data fetch on mount; `load` also powers the manual refresh button.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  return (
    <div className="relative min-h-full overflow-x-clip">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[640px] overflow-hidden">
        <div className="absolute -top-24 left-[-10%] h-72 w-72 rounded-full bg-indigo-200/40 blur-3xl sm:h-96 sm:w-96" />
        <div className="absolute top-24 right-[-10%] h-72 w-72 rounded-full bg-sky-200/30 blur-3xl sm:h-96 sm:w-96" />
        <div className="absolute top-96 left-1/3 h-64 w-64 rounded-full bg-violet-200/25 blur-3xl" />
      </div>

      <Header fetchedAt={fetchedAt} loading={loading} onRefresh={load} />

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
        {error && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>{error}</span>
            <button
              type="button"
              onClick={load}
              className="shrink-0 rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500"
            >
              Coba Lagi
            </button>
          </div>
        )}

        {loading && events.length === 0 && !error ? (
          <div className="space-y-6">
            <div className="h-40 animate-pulse rounded-2xl bg-gray-100" />
            <div className="h-24 animate-pulse rounded-2xl bg-gray-100" />
            <div className="h-96 animate-pulse rounded-2xl bg-gray-100" />
          </div>
        ) : (
          <>
            <WeekHighlight events={events} />

            <Filters
              months={months}
              selectedMonth={selectedMonth}
              onMonthChange={setSelectedMonth}
              selectedClass={selectedClass}
              onClassChange={setSelectedClass}
              activeEskuls={activeEskuls}
              onToggleEskul={toggleEskul}
              resultCount={filteredEvents.length}
              totalCount={events.length}
            />

            <ScheduleList events={filteredEvents} />
          </>
        )}
      </main>

      <footer className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 py-10 text-center sm:px-6">
        <p className="text-xs text-gray-400">
          Dibangun dari data Google Spreadsheet Jadwal Ekstrakurikuler SMP SMK IDN Akhwat.
        </p>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-indigo-50 to-violet-50 px-3.5 py-1.5 text-xs font-semibold text-indigo-600 ring-1 ring-indigo-100">
          <svg
            className="h-3.5 w-3.5"
            viewBox="0 0 24 24"
            fill="currentColor"
            stroke="none"
          >
            <path d="M12 21s-6.7-4.3-9.3-8.2C1 10 1.5 6.4 4.6 4.9c2.4-1.2 4.8-.3 6.2 1.6l1.2 1.6 1.2-1.6c1.4-1.9 3.8-2.8 6.2-1.6 3.1 1.5 3.6 5.1 1.9 7.9C18.7 16.7 12 21 12 21z" />
          </svg>
          developed by tia
        </span>
      </footer>
    </div>
  );
}
