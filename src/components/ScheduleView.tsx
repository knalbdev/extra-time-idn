"use client";

import { useMemo, useState } from "react";
import { monthLabel } from "@/lib/format";
import type { EskulEvent, EskulKey } from "@/lib/types";
import { type MonthOption, ScheduleFilters } from "./ScheduleFilters";
import { ScheduleControls } from "./ScheduleControls";
import { PageHeading } from "./PageHeading";
import { Icon } from "./Icon";
import { ScheduleTable } from "./ScheduleTable";
import { ScheduleCalendar } from "./ScheduleCalendar";
import { ScheduleStatusSummary } from "./ScheduleStatusSummary";
import { useJakartaToday } from "./useJakartaToday";

export function ScheduleView({
  filteredEvents, months, selectedMonth, onMonthChange, selectedClass,
  onClassChange, activeEskuls, onToggleEskul, onClearFilters, initialDate,
}: {
  filteredEvents: EskulEvent[];
  months: MonthOption[];
  selectedMonth: string;
  onMonthChange: (value: string) => void;
  selectedClass: string;
  onClassChange: (value: string) => void;
  activeEskuls: Set<EskulKey>;
  onToggleEskul: (eskul: EskulKey) => void;
  onClearFilters: () => void;
  initialDate?: string;
}) {
  const today = useJakartaToday();
  const [display, setDisplay] = useState<"calendar" | "list">("calendar");
  const calendarMonth = selectedMonth === "all" ? today.slice(0, 7) : selectedMonth;
  const monthOptions = months.some(month => month.key === calendarMonth) ? months : [...months, { key: calendarMonth, label: monthLabel(calendarMonth) }].sort((a, b) => a.key.localeCompare(b.key));
  const visibleEvents = useMemo(() => display === "calendar" ? filteredEvents.filter(event => event.date.startsWith(calendarMonth)) : filteredEvents, [display, filteredEvents, calendarMonth]);
  const filters = <ScheduleControls activeEskuls={activeEskuls} onToggleEskul={onToggleEskul} resultCount={visibleEvents.length} />;
  const summary = <ScheduleStatusSummary events={visibleEvents} period={display === "list" && selectedMonth === "all" ? "Seluruh periode" : monthLabel(calendarMonth)} />;
  const classFilter = <ScheduleFilters months={monthOptions} selectedMonth={selectedMonth} onMonthChange={onMonthChange} selectedClass={selectedClass} onClassChange={onClassChange} showMonth={display === "list"} />;
  const viewControls = <div role="group" aria-label="Tampilan jadwal" className="inline-flex h-11 items-center rounded-xl border border-outline-variant bg-surface/60 p-1">{[{ key: "calendar", label: "Kalender", icon: "calendar_month" }, { key: "list", label: "Daftar", icon: "format_list_bulleted" }].map(item => <button key={item.key} type="button" aria-pressed={display === item.key} onClick={() => {setDisplay(item.key as typeof display);if(item.key === "calendar" && selectedMonth === "all") onMonthChange(today.slice(0, 7));}} className={`inline-flex h-full items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition ${display === item.key ? "bg-primary text-white" : "text-on-surface-variant hover:bg-white"}`}><Icon name={item.icon} className="text-lg" />{item.label}</button>)}</div>;

  return <div className="flex min-w-0 flex-col gap-6">
    <PageHeading eyebrow="JADWAL KEGIATAN" title="Jadwal Ekstrakurikuler" description="Lihat jadwal kegiatan, kelas peserta, dan status pelaksanaan tahun ajaran 2026/2027." icon="calendar_month" />
    {display === "calendar" ? <ScheduleCalendar key={calendarMonth} initialDate={initialDate} events={visibleEvents} month={calendarMonth} today={today} onMonthChange={onMonthChange} headerControls={<>{classFilter}{viewControls}</>} filters={filters} summary={summary} /> :
      <section aria-label="Daftar jadwal" className="card min-w-0 overflow-hidden rounded-3xl">
        <header className="flex flex-wrap items-end justify-between gap-4 p-4 sm:px-6 sm:py-5"><div><p className="eyebrow">AGENDA KEGIATAN</p><h2 className="mt-1 font-heading text-2xl font-bold">Daftar Ekstrakurikuler</h2></div><div className="flex w-full flex-wrap items-end gap-3 sm:w-auto">{classFilter}{viewControls}</div></header>
        <div className="border-y border-outline-variant/50 px-4 py-4 sm:px-6">{filters}</div>
        <ScheduleTable events={visibleEvents} onClearFilters={onClearFilters} embedded />
        <div className="border-t border-outline-variant/50 bg-surface/30 p-4 sm:p-6">{summary}</div>
      </section>}
  </div>;
}
