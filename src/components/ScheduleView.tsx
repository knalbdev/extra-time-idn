"use client";

import { useMemo } from "react";
import { ESKUL_ORDER, STATUS_BUCKET_META, STATUS_META } from "@/lib/constants";
import { nextUpcomingEvent } from "@/lib/schedule";
import { EskulEvent, EskulKey, StatusBucket } from "@/lib/types";
import { EskulToggleBar } from "./EskulToggleBar";
import { MonthOption, ScheduleFilters } from "./ScheduleFilters";
import { NextActivityCard } from "./NextActivityCard";
import { ScheduleTable } from "./ScheduleTable";
import { StatusLegend } from "./StatusLegend";

const BUCKET_ORDER: StatusBucket[] = ["completed", "upcoming", "canceled"];

export function ScheduleView({
  events,
  filteredEvents,
  months,
  selectedMonth,
  onMonthChange,
  selectedClass,
  onClassChange,
  activeEskuls,
  onToggleEskul,
  onClearFilters,
}: {
  events: EskulEvent[];
  filteredEvents: EskulEvent[];
  months: MonthOption[];
  selectedMonth: string;
  onMonthChange: (v: string) => void;
  selectedClass: string;
  onClassChange: (v: string) => void;
  activeEskuls: Set<EskulKey>;
  onToggleEskul: (eskul: EskulKey) => void;
  onClearFilters: () => void;
}) {
  const next = useMemo(() => nextUpcomingEvent(events), [events]);

  const bucketCounts = useMemo(() => {
    const counts = new Map<StatusBucket, number>();
    for (const e of filteredEvents) {
      const bucket = STATUS_META[e.statusNormalized].bucket;
      counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
    }
    return counts;
  }, [filteredEvents]);

  const total = filteredEvents.length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-primary md:text-3xl">
            Jadwal Ekstrakurikuler
          </h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Tahun Ajaran 2026/2027 &middot; {ESKUL_ORDER.length} ekstrakurikuler aktif
          </p>
        </div>
        <ScheduleFilters
          months={months}
          selectedMonth={selectedMonth}
          onMonthChange={onMonthChange}
          selectedClass={selectedClass}
          onClassChange={onClassChange}
        />
      </div>

      <StatusLegend />

      <EskulToggleBar
        activeEskuls={activeEskuls}
        onToggleEskul={onToggleEskul}
        resultCount={filteredEvents.length}
        totalCount={events.length}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <ScheduleTable events={filteredEvents} onClearFilters={onClearFilters} />
        </div>

        <div className="flex flex-col gap-6 lg:col-span-4">
          <NextActivityCard event={next} />

          <div className="glass-card rounded-xl p-6">
            <h3 className="font-heading text-lg font-semibold text-primary">Ringkasan Status</h3>
            <p className="mt-0.5 text-xs text-on-surface-variant">Berdasarkan filter saat ini</p>

            <div className="mt-4 flex flex-col gap-3">
              {total === 0 ? (
                <p className="text-sm text-on-surface-variant">Tidak ada data.</p>
              ) : (
                BUCKET_ORDER.map((key) => {
                  const meta = STATUS_BUCKET_META[key];
                  const count = bucketCounts.get(key) ?? 0;
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                  return (
                    <div key={key} className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-on-surface-variant">{meta.label}</span>
                        <span className="rounded bg-surface-container px-2 py-0.5 text-xs font-semibold text-on-surface">
                          {count}
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-surface-container">
                        <div
                          className={`h-1.5 rounded-full ${meta.dot}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
