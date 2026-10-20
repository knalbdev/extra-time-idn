"use client";

import { useCallback, useId, useMemo, useState, type ReactNode } from "react";
import { ESKUL_META, STATUS_BUCKET_META, STATUS_META } from "@/lib/constants";
import { calendarMonthWeeks, shiftCalendarMonth } from "@/lib/calendar";
import { formatLongIndo, monthLabel, summarizeClasses } from "@/lib/format";
import type { EskulEvent } from "@/lib/types";
import { CalendarDayPopover, type CalendarDaySelection } from "./CalendarDayPopover";
import { Icon } from "./Icon";

const weekdays = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
const clockMinutes = (time: string) => {
  const match = time.match(/(\d{1,2})[.:,](\d{2})/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : Infinity;
};
const navButton = "inline-flex h-10 items-center justify-center rounded-xl border border-outline-variant bg-white px-3 text-xs font-semibold text-primary transition hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary";

export function ScheduleCalendar({ events, month, today, onMonthChange, headerControls, filters, summary, initialDate }: {
  events: EskulEvent[];
  month: string;
  today: string;
  onMonthChange: (month: string) => void;
  headerControls?: ReactNode;
  filters?: ReactNode;
  summary?: ReactNode;
  initialDate?: string;
}) {
  const weeks = useMemo(() => calendarMonthWeeks(month), [month]);
  const byDate = useMemo(() => {
    const groups = new Map<string, EskulEvent[]>();
    for (const event of events) {
      const group = groups.get(event.date) ?? [];
      group.push(event);
      groups.set(event.date, group);
    }
    for (const group of groups.values()) group.sort((a, b) => clockMinutes(a.time) - clockMinutes(b.time) || a.eskul.localeCompare(b.eskul));
    return groups;
  }, [events]);
  const [chosenDate, setChosenDate] = useState<string | null>(initialDate?.startsWith(month) ? initialDate : null);
  const [popover, setPopover] = useState<CalendarDaySelection | null>(null);
  const popoverId = useId();
  const dismissPopover = useCallback((selection: CalendarDaySelection) => setPopover(current => current === selection ? null : current), []);
  const selectedDate = chosenDate ?? (today.startsWith(month) ? today : [...byDate.keys()].filter(date => date.startsWith(month)).sort()[0] ?? `${month}-01`);
  const monthCount = events.filter(event => event.date.startsWith(month)).length;

  return <section aria-label="Kalender jadwal" className="card min-w-0 overflow-hidden rounded-3xl">
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-outline-variant/50 p-4 sm:px-6 sm:py-5">
      <div><p className="eyebrow">Kalender Ekstrakurikuler</p><h2 className="mt-1 font-heading text-2xl font-bold text-primary">{monthLabel(month)}</h2><p className="mt-1 text-xs text-on-surface-variant">{monthCount} kegiatan · Pilih tanggal untuk melihat rincian</p></div>
      <div className="flex w-full flex-wrap items-end gap-3 sm:w-auto">
        {headerControls}
        <div className="flex items-center gap-2">
        <button type="button" className={navButton} aria-label="Bulan sebelumnya" onClick={() => onMonthChange(shiftCalendarMonth(month, -1))}><Icon name="chevron_left" className="text-xl" /></button>
        <button type="button" className={navButton} onClick={() => { setPopover(null); setChosenDate(today); onMonthChange(today.slice(0, 7)); }}>Hari ini</button>
        <button type="button" className={navButton} aria-label="Bulan berikutnya" onClick={() => onMonthChange(shiftCalendarMonth(month, 1))}><Icon name="chevron_right" className="text-xl" /></button>
        </div>
      </div>
    </header>

    {filters && <div className="border-b border-outline-variant/50 px-4 py-4 sm:px-6">{filters}</div>}

    <div className="flex flex-wrap items-center justify-between gap-3 bg-blue-50/40 px-4 py-3 sm:px-6">
      <p className="flex items-center gap-2 text-xs font-medium text-primary"><span className="h-2 w-2 shrink-0 rounded-full bg-secondary" />Hari ini · {formatLongIndo(today)} · WIB</p>
      <div aria-label="Keterangan status kalender" className="flex flex-wrap gap-3 text-[10px] text-on-surface-variant">{["completed", "upcoming", "canceled"].map(key => {
        const meta = STATUS_BUCKET_META[key as keyof typeof STATUS_BUCKET_META];
        return <span key={key} className="inline-flex items-center gap-1.5"><span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />{meta.label}</span>;
      })}</div>
    </div>

    <table className="w-full table-fixed border-collapse text-left">
      <caption className="sr-only">Kalender {monthLabel(month)}, pekan dimulai hari Senin. Pilih tanggal untuk melihat kelas, waktu, dan status kegiatan.</caption>
      <thead><tr>{weekdays.map((day, index) => <th key={day} scope="col" className={`border-y border-outline-variant/50 px-1 py-3 text-center text-[10px] font-semibold sm:text-xs ${index > 4 ? "bg-surface text-on-surface-variant" : "text-primary"}`}><span className="sm:hidden">{day.slice(0, 3)}</span><span className="hidden sm:inline">{day}</span></th>)}</tr></thead>
      <tbody>{weeks.map(week => <tr key={week[0]}>{week.map((date, index) => {
        const inMonth = date.startsWith(month);
        const sessions = byDate.get(date) ?? [];
        const isToday = date === today;
        const selected = date === selectedDate;
        const number = Number(date.slice(-2));
        return <td key={date} className="border-b border-r border-outline-variant/40 p-0 align-top last:border-r-0">
          {inMonth ? <button type="button" aria-label={`${formatLongIndo(date)} · ${sessions.length} kegiatan${isToday ? " · Hari ini" : ""}`} aria-pressed={selected} aria-haspopup="dialog" aria-expanded={popover?.date === date} aria-controls={popover?.date === date ? popoverId : undefined} aria-current={isToday ? "date" : undefined} onClick={event => {setChosenDate(date);const anchor=event.currentTarget;setPopover(current=>current?.anchor===anchor?null:{date,anchor});}} className={`flex min-h-[88px] w-full min-w-0 flex-col gap-2 px-1 py-2 text-left transition focus-visible:relative focus-visible:z-10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-secondary sm:min-h-[170px] sm:px-2 sm:py-3 ${selected ? "bg-blue-50 ring-2 ring-inset ring-secondary" : isToday ? "bg-blue-50/40 hover:bg-blue-50" : index > 4 ? "bg-surface/50 hover:bg-blue-50/60" : "bg-white hover:bg-blue-50/60"}`}>
            <span className="flex w-full items-center justify-between gap-1"><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold sm:text-sm ${isToday ? "bg-secondary text-white" : "text-primary"}`}>{number}</span><span className="hidden text-[9px] font-semibold text-secondary sm:inline">{isToday ? "Hari ini" : ""}</span></span>
            {!!sessions.length && <>
              <span aria-hidden className="block w-full min-w-0 space-y-1">{sessions.slice(0, 3).map(event => <span key={event.id} title={`${event.eskulLabel} · ${event.classes.join(", ")} · ${event.time}`} className={`block min-w-0 rounded-md px-1 py-1 text-[8px] leading-tight sm:px-1.5 sm:text-[10px] ${ESKUL_META[event.eskul].chip}`}><span className="flex min-w-0 items-center gap-1"><span className={`hidden h-1.5 w-1.5 shrink-0 rounded-full sm:inline ${STATUS_BUCKET_META[STATUS_META[event.statusNormalized].bucket].dot}`} /><span className="min-w-0 truncate font-semibold">{event.eskulLabel}</span><span className="ml-auto hidden shrink-0 text-[9px] lg:inline">{event.time.match(/\d{1,2}[.:,]\d{2}/)?.[0]}</span></span><span className="mt-0.5 block break-words font-medium opacity-90"><span className="sm:hidden">{summarizeClasses(event.classes).join(", ") || "Kelas belum diisi"}</span><span className="hidden sm:inline">{event.classes.join(", ") || "Kelas belum diisi"}</span></span></span>)}{sessions.length > 3 && <span className="block px-0.5 text-[8px] font-semibold text-secondary sm:px-1 sm:text-[10px]">+{sessions.length - 3}<span className="hidden sm:inline"> kegiatan lainnya</span></span>}</span>
            </>}
          </button> : <span aria-hidden className="block min-h-[88px] bg-surface/70 px-2 py-3 text-xs text-outline/50 sm:min-h-[170px] sm:px-3 sm:text-sm">{number}</span>}
        </td>;
      })}</tr>)}</tbody>
    </table>

    {summary && <div className="border-t border-outline-variant/50 bg-surface/30 p-4 sm:p-6">{summary}</div>}

    {popover && <CalendarDayPopover key={popover.date} id={popoverId} selection={popover} events={byDate.get(popover.date) ?? []} onDismiss={dismissPopover} />}
  </section>;
}
