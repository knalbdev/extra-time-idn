"use client";

import { useMemo } from "react";
import { ESKUL_ORDER } from "@/lib/constants";
import { isoToday, monthKey, monthLabel } from "@/lib/format";
import { computeWeekHighlight } from "@/lib/schedule";
import { EskulEvent } from "@/lib/types";
import { StatCard } from "./StatCard";
import { WeekActivityCard } from "./WeekActivityCard";

export function DashboardView({ events }: { events: EskulEvent[] }) {
  const { rangeLabel, weekEvents, fallback } = useMemo(
    () => computeWeekHighlight(events),
    [events],
  );

  const thisMonthCount = useMemo(() => {
    const current = monthKey(isoToday());
    return events.filter((e) => monthKey(e.date) === current).length;
  }, [events]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-primary md:text-3xl">
          Dashboard Ekstrakurikuler
        </h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Ringkasan jadwal ekstrakurikuler SMP SMK IDN Akhwat.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="glass-card rounded-xl p-6 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant/40 pb-3">
            <h2 className="font-heading text-lg font-semibold text-primary">
              {fallback ? "Jadwal Terdekat" : "Ekskul Pekan Ini"}
            </h2>
            <span className="inline-flex items-center rounded-full bg-secondary/10 px-3 py-1 text-xs font-semibold text-secondary">
              {rangeLabel}
            </span>
          </div>

          {weekEvents.length === 0 ? (
            <p className="mt-4 text-sm text-on-surface-variant">
              Belum ada jadwal ekstrakurikuler yang tersedia.
            </p>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {weekEvents.map((event) => (
                <WeekActivityCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </section>

        <div className="space-y-4">
          <StatCard
            label={`Total Jadwal (${monthLabel(monthKey(isoToday()))})`}
            value={thisMonthCount}
            icon="bar_chart"
            iconBg="bg-sky-100"
            iconColor="text-sky-600"
          />
          <StatCard
            label="Ekstrakurikuler Aktif"
            value={ESKUL_ORDER.length}
            hint="Renang, Panahan, Berkuda, Taekwondo, Pramuka"
            icon="groups"
            iconBg="bg-amber-100"
            iconColor="text-amber-600"
          />
        </div>
      </div>
    </div>
  );
}
