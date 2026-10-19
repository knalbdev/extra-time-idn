"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { STATUS_BUCKET_META, STATUS_META } from "@/lib/constants";
import { nextUpcomingEvent } from "@/lib/schedule";
import { EskulEvent, EskulKey, StatusBucket } from "@/lib/types";
import { AnimatedNumber } from "./AnimatedNumber";
import { MonthOption, ScheduleFilters } from "./ScheduleFilters";
import { NextActivityCard } from "./NextActivityCard";
import { ScheduleControls } from "./ScheduleControls";
import { PageHeading } from "./PageHeading";
import { Icon } from "./Icon";
import { ScheduleTable } from "./ScheduleTable";
import { ScheduleCalendar } from "./ScheduleCalendar";
import { useJakartaToday } from "./useJakartaToday";
import { monthLabel } from "@/lib/format";

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
  const today = useJakartaToday();
  const [display, setDisplay] = useState<"calendar" | "list">("calendar");
  const calendarMonth = selectedMonth === "all" ? today.slice(0, 7) : selectedMonth;
  const monthOptions = months.some(month => month.key === calendarMonth) ? months : [...months, { key: calendarMonth, label: monthLabel(calendarMonth) }].sort((a, b) => a.key.localeCompare(b.key));
  const visibleEvents = useMemo(() => display === "calendar" ? filteredEvents.filter(event => event.date.startsWith(calendarMonth)) : filteredEvents, [display, filteredEvents, calendarMonth]);
  const next = nextUpcomingEvent(visibleEvents);

  const bucketCounts = useMemo(() => {
    const counts = new Map<StatusBucket, number>();
    for (const e of visibleEvents) {
      const bucket = STATUS_META[e.statusNormalized].bucket;
      counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
    }
    return counts;
  }, [visibleEvents]);

  const total = visibleEvents.length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeading eyebrow="RENCANAKAN AKTIVITASMU" title="Jadwal Ekstrakurikuler" description="Temukan kegiatan, siapkan waktumu. Semua agenda tahun ajaran 2026/2027 dalam satu tempat." icon="calendar_month">
      <div className="card flex flex-col gap-5 rounded-2xl p-5 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="flex items-center gap-2 text-sm font-semibold text-primary"><Icon name="tune" className="text-lg text-secondary" />Sesuaikan agendamu</p><p className="mt-1 text-xs text-on-surface-variant">Pilih periode dan kelas untuk melihat jadwal yang relevan.</p></div>
        <ScheduleFilters
          months={monthOptions}
          selectedMonth={display === "calendar" ? calendarMonth : selectedMonth}
          onMonthChange={onMonthChange}
          selectedClass={selectedClass}
          onClassChange={onClassChange}
          allowAllMonths={display === "list"}
        />
      </div>
      </PageHeading>

      <ScheduleControls
        activeEskuls={activeEskuls}
        onToggleEskul={onToggleEskul}
        resultCount={visibleEvents.length}
        totalCount={events.length}
      />

      <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-on-surface-variant">{display === "calendar" ? "Lihat sebaran kegiatan dalam kalender bulanan." : "Lihat seluruh rincian kegiatan dalam daftar."}</p><div role="group" aria-label="Tampilan jadwal" className="inline-flex rounded-xl border border-outline-variant bg-white p-1">{[{ key: "calendar", label: "Kalender", icon: "calendar_month" }, { key: "list", label: "Daftar", icon: "format_list_bulleted" }].map(item => <button key={item.key} type="button" aria-pressed={display === item.key} onClick={() => {setDisplay(item.key as typeof display);if(item.key === "calendar" && selectedMonth === "all") onMonthChange(today.slice(0, 7));}} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition ${display === item.key ? "bg-primary text-white" : "text-on-surface-variant hover:bg-surface"}`}><Icon name={item.icon} className="text-lg" />{item.label}</button>)}</div></div>

      <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-12">
        <div className={`min-w-0 ${display === "calendar" ? "xl:col-span-12" : "xl:col-span-8"}`}>
          {display === "calendar" ? <ScheduleCalendar key={calendarMonth} events={visibleEvents} month={calendarMonth} today={today} onMonthChange={onMonthChange} /> : <ScheduleTable events={visibleEvents} onClearFilters={onClearFilters} />}
        </div>

        <div className={display === "calendar" ? "grid min-w-0 gap-6 md:grid-cols-2 xl:col-span-12" : "flex min-w-0 flex-col gap-6 xl:col-span-4"}>
          <NextActivityCard event={next} />

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="card rounded-2xl p-6"
          >
            <p className="eyebrow">PROGRES KEGIATAN</p>
            <h3 className="mt-1 font-heading text-xl font-bold text-primary">Ringkasan status</h3>
            <p className="mt-0.5 text-xs text-on-surface-variant">Berdasarkan filter saat ini</p>

            <div className="mt-6 flex flex-col gap-5">
              {total === 0 ? (
                <p className="text-sm text-on-surface-variant">Tidak ada data.</p>
              ) : (
                BUCKET_ORDER.map((key) => {
                  const meta = STATUS_BUCKET_META[key];
                  const count = bucketCounts.get(key) ?? 0;
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                  return (
                    <div key={key} className="rounded-xl bg-surface/70 p-3.5 flex flex-col gap-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-on-surface-variant">{meta.label}</span>
                        <span className="rounded bg-surface-container px-2 py-0.5 text-xs font-semibold text-on-surface">
                          <AnimatedNumber value={count} /> · {pct}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                          className={`h-1.5 rounded-full ${meta.dot}`}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
