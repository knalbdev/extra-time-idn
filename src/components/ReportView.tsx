"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import { ESKUL_META } from "@/lib/constants";
import {
  formatShortIndo,
  monthKey,
  monthLabel,
  summarizeClasses,
  weekOfMonth,
  weekOfMonthRange,
} from "@/lib/format";
import { fadeInItem, staggerContainer } from "@/lib/motion";
import { EskulEvent, EskulKey } from "@/lib/types";
import { AnimatedNumber } from "./AnimatedNumber";
import { ClassChip, StatusChip } from "./Badges";
import { EskulIcon } from "./EskulIcon";
import { PageHeading } from "./PageHeading";
import { Icon } from "./Icon";
import { useExtracurriculars } from "./ExtracurricularProvider";

interface EskulReport {
  eskul: EskulKey;
  label: string;
  total: number;
  completed: number;
  events: EskulEvent[];
}

function buildReports(events: EskulEvent[], enabled: EskulKey[]): EskulReport[] {
  const byEskul = new Map<EskulKey, EskulEvent[]>();
  for (const e of events) {
    if (!byEskul.has(e.eskul)) byEskul.set(e.eskul, []);
    byEskul.get(e.eskul)!.push(e);
  }
  return enabled.map((eskul) => {
    const list = (byEskul.get(eskul) ?? []).slice().sort((a, b) => a.date.localeCompare(b.date));
    const completed = list.filter((e) => e.statusNormalized === "selesai").length;
    return { eskul, label: ESKUL_META[eskul].label, total: list.length, completed, events: list };
  });
}

export function ReportView({ events }: { events: EskulEvent[] }) {
  const { enabledEskuls } = useExtracurriculars();
  const months = useMemo(() => {
    const keys = new Set(events.map((e) => monthKey(e.date)));
    return Array.from(keys)
      .sort()
      .map((key) => ({ key, label: monthLabel(key) }));
  }, [events]);

  const [selectedMonth, setSelectedMonth] = useState("all");
  const [selectedWeek, setSelectedWeek] = useState<number | "all">("all");
  const [expanded, setExpanded] = useState<Set<EskulKey>>(new Set());

  const weeksInSelectedMonth = useMemo(() => {
    if (selectedMonth === "all") return [];
    const weeks = new Set<number>();
    for (const e of events) {
      if (monthKey(e.date) === selectedMonth) weeks.add(weekOfMonth(e.date));
    }
    return Array.from(weeks).sort((a, b) => a - b);
  }, [events, selectedMonth]);

  const handleMonthChange = (value: string) => {
    setSelectedMonth(value);
    setSelectedWeek("all");
  };

  const scopedEvents = useMemo(() => {
    let list = events;
    if (selectedMonth !== "all") list = list.filter((e) => monthKey(e.date) === selectedMonth);
    if (selectedMonth !== "all" && selectedWeek !== "all") {
      list = list.filter((e) => weekOfMonth(e.date) === selectedWeek);
    }
    return list;
  }, [events, selectedMonth, selectedWeek]);

  const reports = useMemo(() => buildReports(scopedEvents, enabledEskuls), [scopedEvents, enabledEskuls]);

  const totalCompleted = reports.reduce((sum, r) => sum + r.completed, 0);
  const totalScheduled = scopedEvents.length;
  const activeEskulCount = reports.filter((r) => r.total > 0).length;

  const dateRangeLabel = useMemo(() => {
    if (scopedEvents.length === 0) return "—";
    const sorted = [...scopedEvents].sort((a, b) => a.date.localeCompare(b.date));
    const first = sorted[0].date;
    const last = sorted[sorted.length - 1].date;
    return first === last
      ? formatShortIndo(first)
      : `${formatShortIndo(first)} – ${formatShortIndo(last)}`;
  }, [scopedEvents]);

  const toggle = (eskul: EskulKey) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(eskul)) next.delete(eskul);
      else next.add(eskul);
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeading eyebrow="CATATAN PERJALANAN" title="Laporan Pelaksanaan" description="Lihat sejauh mana kegiatan berjalan. Telusuri progres dan riwayat pelaksanaan setiap ekstrakurikuler." icon="monitoring">
      <div className="card flex flex-col gap-5 rounded-2xl p-5 lg:flex-row lg:items-center lg:justify-between">
        <div><p className="flex items-center gap-2 text-sm font-semibold text-primary"><Icon name="date_range" className="text-lg text-secondary" />Periode laporan</p><p className="mt-1 text-xs text-on-surface-variant">Tinjau satu pekan, satu bulan, atau seluruh tahun ajaran.</p></div>
        <div className="flex w-full flex-wrap gap-3 sm:w-auto">
          <label className="block w-full text-sm sm:w-52">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">
              Bulan
            </span>
            <div className="relative">
              <select
                value={selectedMonth}
                onChange={(e) => handleMonthChange(e.target.value)}
                className="w-full appearance-none rounded-xl border border-outline-variant bg-white px-3.5 py-3 pr-9 text-sm font-medium text-on-surface transition hover:border-secondary/50 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/15"
              >
                <option value="all">Sepanjang Tahun Ajaran</option>
                {months.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.label}
                  </option>
                ))}
              </select>
              <Icon
                name="expand_more"
                className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-lg text-on-surface-variant"
              />
            </div>
          </label>

          <label className="block w-full text-sm sm:w-44">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">
              Pekan
            </span>
            <div className="relative">
              <select
                value={selectedWeek}
                onChange={(e) =>
                  setSelectedWeek(e.target.value === "all" ? "all" : Number(e.target.value))
                }
                disabled={selectedMonth === "all"}
                className="w-full appearance-none rounded-xl border border-outline-variant bg-white px-3.5 py-3 pr-9 text-sm font-medium text-on-surface transition hover:border-secondary/50 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/15 disabled:cursor-not-allowed disabled:bg-surface-container disabled:text-on-surface-variant/60"
              >
                <option value="all">Semua Pekan</option>
                {weeksInSelectedMonth.map((week) => {
                  const { startDay, endDay } = weekOfMonthRange(selectedMonth, week);
                  return (
                    <option key={week} value={week}>
                      Pekan {week} ({startDay}–{endDay})
                    </option>
                  );
                })}
              </select>
              <Icon
                name="expand_more"
                className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-lg text-on-surface-variant"
              />
            </div>
          </label>
        </div>
      </div>
      </PageHeading>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[{ label: "Sudah terlaksana", value: totalCompleted, icon: "task_alt", color: "bg-emerald-50 text-emerald-600" }, { label: "Total dijadwalkan", value: totalScheduled, icon: "event_note", color: "bg-blue-50 text-blue-600" }, { label: "Ekskul tercatat", value: activeEskulCount, icon: "interests", color: "bg-violet-50 text-violet-600" }].map((stat) => <div key={stat.label} className="card rounded-2xl p-5"><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.color}`}><Icon name={stat.icon} className="text-xl" /></span><p className="mt-4 font-heading text-3xl font-bold text-primary"><AnimatedNumber value={stat.value} /></p><p className="mt-1 text-xs text-on-surface-variant">{stat.label}</p></div>)}
        <div className="card rounded-2xl p-5"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><Icon name="date_range" className="text-xl" /></span><p className="mt-4 text-sm font-bold leading-relaxed text-primary">{dateRangeLabel}</p><p className="mt-1 text-xs text-on-surface-variant">Rentang tanggal</p></div>
      </div>

      <section className="dashboard-hero relative isolate overflow-hidden rounded-2xl p-6 text-white sm:p-7"><div aria-hidden className="hero-orbit" /><div className="relative flex flex-wrap items-center justify-between gap-5"><div><p className="text-[10px] font-semibold tracking-[.16em] text-blue-100/70">PROGRES PERIODE TERPILIH</p><h2 className="mt-2 font-heading text-xl font-bold">Setiap kegiatan, satu langkah maju.</h2><p className="mt-2 text-xs text-blue-100/80">{totalCompleted} dari {totalScheduled} jadwal tercatat sudah terlaksana.</p></div><p className="font-heading text-5xl font-bold">{totalScheduled ? Math.round(totalCompleted / totalScheduled * 100) : 0}<span className="text-2xl text-blue-200">%</span></p></div><div className="relative mt-5 h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-teal-300 transition-all duration-500" style={{ width: `${totalScheduled ? totalCompleted / totalScheduled * 100 : 0}%` }} /></div></section>
      <div className="flex flex-wrap items-end justify-between gap-2"><div><p className="eyebrow">DETAIL PROGRAM</p><h2 className="mt-1 font-heading text-xl font-bold text-primary">Progres setiap ekstrakurikuler</h2></div><p className="text-xs text-on-surface-variant">Pilih program untuk melihat riwayat kegiatan</p></div>
      {scopedEvents.length === 0 && <div className="card flex flex-col items-center rounded-2xl p-8 text-center"><Icon name="query_stats" className="text-4xl text-secondary/50" /><p className="mt-3 text-sm font-semibold text-primary">Belum ada kegiatan pada periode ini</p><button onClick={() => handleMonthChange("all")} className="mt-4 rounded-xl bg-blue-50 px-4 py-2 text-xs font-semibold text-secondary">Lihat seluruh periode</button></div>}

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="flex flex-col gap-4"
      >
        {reports.map((report) => {
          const meta = ESKUL_META[report.eskul];
          const isOpen = expanded.has(report.eskul);
          const pct = report.total > 0 ? Math.round((report.completed / report.total) * 100) : 0;
          return (
            <motion.section
              key={report.eskul}
              variants={fadeInItem}
              className="card overflow-hidden rounded-2xl"
            >
              <button
                type="button"
                onClick={() => toggle(report.eskul)}
                disabled={report.total === 0}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-4 px-5 py-6 text-left transition hover:bg-secondary/5 disabled:cursor-default disabled:hover:bg-transparent"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${meta.iconBg}`}
                  >
                    <EskulIcon eskul={report.eskul} className={`h-5 w-5 ${meta.iconColor}`} />
                  </span>
                  <div>
                    <p className="font-heading text-lg font-bold text-on-surface">
                      {report.label}
                    </p>
                    <p className="text-xs text-on-surface-variant">
                      {report.total === 0
                        ? "Belum ada jadwal"
                        : `${report.completed} kali terlaksana dari ${report.total} jadwal`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex w-14 shrink-0 flex-col gap-2 sm:w-28">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                        className="h-1.5 rounded-full bg-status-completed"
                      />
                    </div>
                    <span className="text-right text-[11px] font-semibold text-on-surface-variant">
                      {pct}%
                    </span>
                  </div>
                  {report.total > 0 && (
                    <motion.span
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 22 }}
                    >
                      <Icon name="expand_more" className="text-xl text-on-surface-variant" />
                    </motion.span>
                  )}
                </div>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && report.total > 0 && (
                  <motion.div
                    key="content"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden border-t border-outline-variant/30"
                  >
                    <ul className="flex flex-col gap-2 bg-surface/50 p-3 sm:p-4">
                      {report.events.map((event) => (
                        <li
                          key={event.id}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-outline-variant/60 bg-white px-4 py-4"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-on-surface">
                              {formatShortIndo(event.date)}
                              {event.extra ? ` · ${event.extra}` : ""}
                            </p>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {summarizeClasses(event.classes).map((c) => (
                                <ClassChip key={c} label={c} />
                              ))}
                            </div>
                          </div>
                          <StatusChip status={event.statusNormalized} />
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.section>
          );
        })}
      </motion.div>
    </div>
  );
}
