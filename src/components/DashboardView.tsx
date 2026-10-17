"use client";

import { motion } from "framer-motion";
import { ESKUL_META, ESKUL_ORDER } from "@/lib/constants";
import { isoToday, monthKey, monthLabel } from "@/lib/format";
import { fadeInItem } from "@/lib/motion";
import { computeWeekHighlight, groupEventsByDate, isEventLiveNow, isEventPast } from "@/lib/schedule";
import { EskulEvent } from "@/lib/types";
import { AnimatedNumber } from "./AnimatedNumber";
import { WeekTimelineRow } from "./WeekTimelineRow";
import { EskulIcon } from "./EskulIcon";
import { Icon } from "./Icon";

export function DashboardView({ events, onViewSchedule }: { events: EskulEvent[]; onViewSchedule: () => void }) {
  const { rangeLabel, weekEvents, fallback } = computeWeekHighlight(events);
  const dayGroups = groupEventsByDate(weekEvents);
  const currentMonth = monthKey(isoToday());
  const monthly = events.filter((event) => monthKey(event.date) === currentMonth);
  const completed = monthly.filter((event) => event.statusNormalized === "selesai").length;
  const canceled = monthly.filter((event) => ["libur", "ditiadakan"].includes(event.statusNormalized)).length;
  const upcoming = monthly.length - completed - canceled;
  const stats = [
    { label: "Total kegiatan", value: monthly.length, icon: "calendar_month", color: "bg-blue-50 text-blue-600", note: "Jadwal bulan ini" },
    { label: "Sudah terlaksana", value: completed, icon: "task_alt", color: "bg-emerald-50 text-emerald-600", note: "Berdasarkan status kegiatan" },
    { label: "Belum terlaksana", value: upcoming, icon: "schedule", color: "bg-amber-50 text-amber-600", note: "Terjadwal & belum terlaksana" },
    { label: "Program ekskul", value: ESKUL_ORDER.length, icon: "interests", color: "bg-violet-50 text-violet-600", note: "Pilihan pengembangan diri" },
  ];

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="eyebrow">OVERVIEW</p><h1 className="mt-2 font-heading text-3xl font-bold tracking-tight text-primary md:text-4xl">Ruang tumbuh, penuh aktivitas.</h1><p className="mt-2 text-sm text-on-surface-variant">Pantau kegiatan dan setiap progres kecil di IDN Akhwat.</p></div>
        <span className="flex items-center gap-2 rounded-full border border-outline-variant bg-white px-4 py-2.5 text-xs font-semibold text-primary"><Icon name="calendar_today" className="text-base" />{monthLabel(currentMonth)}</span>
      </div>

      <motion.section variants={fadeInItem} initial="hidden" animate="show" className="dashboard-hero relative isolate overflow-hidden rounded-3xl p-6 text-white sm:p-8">
        <div aria-hidden className="hero-orbit" />
        <div className="relative max-w-lg"><span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-medium"><span className="h-1.5 w-1.5 rounded-full bg-teal-300" />Tahun ajaran 2026 / 2027</span><h2 className="mt-5 font-heading text-2xl font-bold leading-tight sm:text-3xl">Temukan ritme.<br />Kembangkan potensi.</h2><p className="mt-3 max-w-sm text-sm leading-relaxed text-blue-100/80">Dari kolam renang hingga lapangan panahan, semua jadwal kegiatan ada di sini.</p><button onClick={onViewSchedule} className="mt-6 inline-flex items-center gap-3 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-primary transition hover:bg-blue-50">Jelajahi jadwal<Icon name="arrow_forward" className="text-lg" /></button></div>
        <div aria-hidden className="absolute right-10 top-1/2 hidden -translate-y-1/2 grid-cols-2 gap-3 xl:grid">{ESKUL_ORDER.slice(0, 4).map((key, index) => <div key={key} className={`flex h-24 w-28 flex-col items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 backdrop-blur-sm ${index % 2 ? "translate-y-5" : ""}`}><EskulIcon eskul={key} className="h-7 w-7 text-sky-100" /><span className="text-xs font-medium text-blue-100">{ESKUL_META[key].label}</span></div>)}</div>
      </motion.section>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{stats.map((stat) => <div key={stat.label} className="card rounded-2xl p-4 sm:p-5"><div className="flex items-center justify-between gap-2"><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.color}`}><Icon name={stat.icon} className="text-xl" /></span><span className="text-[10px] font-medium text-on-surface-variant">BULAN INI</span></div><p className="mt-5 font-heading text-3xl font-bold tracking-tight text-primary"><AnimatedNumber value={stat.value} /></p><p className="mt-1 text-sm font-semibold text-primary">{stat.label}</p><p className="mt-1 text-[11px] leading-relaxed text-on-surface-variant">{stat.note}</p></div>)}</div>

      <div className="grid items-start gap-6 xl:grid-cols-[1.5fr_1fr]">
        <section className="card overflow-hidden rounded-2xl"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/60 p-5 sm:p-6"><div><p className="eyebrow">AGENDA KEGIATAN</p><h2 className="mt-1 font-heading text-xl font-bold text-primary">{fallback ? "Jadwal terdekat" : "Pekan ini"}</h2></div><span className="rounded-lg bg-surface px-3 py-2 text-[11px] font-medium text-on-surface-variant">{fallback && dayGroups.length ? dayGroups[0].dateLabel : rangeLabel}</span></div><div className="p-5 sm:p-6">{dayGroups.length === 0 ? <div className="flex flex-col items-center py-10 text-center"><Icon name="event_available" className="mb-3 text-4xl text-secondary/50" /><p className="text-sm font-semibold text-primary">Belum ada agenda terdekat</p><p className="mt-2 text-xs text-on-surface-variant">Jadwal akan muncul setelah tersedia di sumber data.</p></div> : <div className="flex flex-col gap-6">{dayGroups.map((group) => <div key={group.date}><p className="mb-3 flex items-center gap-2 text-xs font-semibold text-on-surface-variant"><span className="h-1.5 w-1.5 rounded-full bg-secondary" />{group.dateLabel}</p><div className="flex flex-col gap-2">{group.events.map((event) => <WeekTimelineRow key={event.id} event={event} isLive={isEventLiveNow(event)} isPast={isEventPast(event)} />)}</div></div>)}</div>}</div><button onClick={onViewSchedule} className="flex w-full items-center justify-center gap-2 border-t border-outline-variant/60 p-4 text-xs font-semibold text-secondary transition hover:bg-blue-50">Lihat semua jadwal<Icon name="arrow_forward" className="text-base" /></button></section>

        <section className="card rounded-2xl p-5 sm:p-6"><p className="eyebrow">EKSPLORASI</p><h2 className="mt-1 font-heading text-xl font-bold text-primary">Lima cara untuk bertumbuh</h2><p className="mt-2 text-xs leading-relaxed text-on-surface-variant">Aktivitas yang membangun karakter, keberanian, dan kreativitas.</p><div className="mt-5 flex flex-col gap-1">{ESKUL_ORDER.map((key) => { const meta = ESKUL_META[key]; const count = monthly.filter((event) => event.eskul === key).length; return <div key={key} className="flex items-center gap-3 rounded-xl py-3"><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${meta.iconBg}`}><EskulIcon eskul={key} className={`h-5 w-5 ${meta.iconColor}`} /></span><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-primary">{meta.label}</p><p className="mt-1 text-[11px] text-on-surface-variant">{count} jadwal bulan ini</p></div><span className={`h-2 w-2 rounded-full ${meta.iconBg}`} /></div>; })}</div><div className="mt-4 rounded-xl bg-surface p-4"><p className="flex items-center gap-2 text-xs font-semibold text-primary"><Icon name="info" className="text-base text-secondary" />Selalu terhubung</p><p className="mt-2 text-xs leading-relaxed text-on-surface-variant">Gunakan tombol refresh untuk mengambil pembaruan jadwal terbaru.</p></div></section>
      </div>
    </div>
  );
}
