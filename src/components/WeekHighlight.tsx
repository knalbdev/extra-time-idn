"use client";

import { useMemo } from "react";
import { formatLongIndo, isoToday, weekRangeOf } from "@/lib/format";
import { EskulEvent } from "@/lib/types";
import { EventCard } from "./EventCard";

export function WeekHighlight({ events }: { events: EskulEvent[] }) {
  const { rangeLabel, weekEvents, fallback } = useMemo(() => {
    const today = isoToday();
    const range = weekRangeOf(today);
    const inWeek = events
      .filter((e) => e.date >= range.start && e.date <= range.end)
      .sort((a, b) => a.date.localeCompare(b.date));

    if (inWeek.length > 0) {
      return {
        rangeLabel: `${formatLongIndo(range.start)} – ${formatLongIndo(range.end)}`,
        weekEvents: inWeek,
        fallback: false,
      };
    }

    const upcoming = events
      .filter((e) => e.date > range.end)
      .sort((a, b) => a.date.localeCompare(b.date));
    const nextDate = upcoming[0]?.date;
    const nextBatch = nextDate ? upcoming.filter((e) => e.date === nextDate) : [];

    return {
      rangeLabel: `${formatLongIndo(range.start)} – ${formatLongIndo(range.end)}`,
      weekEvents: nextBatch,
      fallback: true,
    };
  }, [events]);

  return (
    <section className="relative overflow-hidden rounded-2xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50 via-white to-sky-50 p-5 shadow-sm sm:p-6">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-gradient-to-br from-indigo-300/30 to-violet-300/20 blur-3xl"
      />

      <div className="relative flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-2.5 w-2.5 animate-ping rounded-full bg-indigo-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-indigo-500" />
          </span>
          <h2 className="text-lg font-bold tracking-tight text-gray-900 sm:text-xl">
            {fallback ? "Jadwal Terdekat" : "Akan Datang Pekan Ini"}
          </h2>
        </div>
        <p className="inline-flex w-fit items-center rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200 sm:text-sm">
          {rangeLabel}
        </p>
      </div>

      {fallback && (
        <p className="relative mt-2 text-sm text-gray-500">
          Tidak ada ekstrakurikuler terjadwal pada pekan ini. Berikut jadwal terdekat berikutnya.
        </p>
      )}

      {weekEvents.length === 0 ? (
        <p className="relative mt-4 text-sm text-gray-500">
          Belum ada jadwal ekstrakurikuler yang tersedia.
        </p>
      ) : (
        <div className="relative mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {weekEvents.map((event) => (
            <EventCard key={event.id} event={event} highlight />
          ))}
        </div>
      )}
    </section>
  );
}
