"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";
import { ESKUL_ORDER } from "@/lib/constants";
import { isoToday, monthKey, monthLabel } from "@/lib/format";
import { fadeInItem, staggerContainer } from "@/lib/motion";
import { computeWeekHighlight, groupEventsByDate, isEventLiveNow, isEventPast } from "@/lib/schedule";
import { EskulEvent } from "@/lib/types";
import { AnimatedNumber } from "./AnimatedNumber";
import { WeekTimelineRow } from "./WeekTimelineRow";

export function DashboardView({ events }: { events: EskulEvent[] }) {
  const { rangeLabel, weekEvents, fallback } = useMemo(
    () => computeWeekHighlight(events),
    [events],
  );

  const dayGroups = useMemo(() => groupEventsByDate(weekEvents), [weekEvents]);

  const thisMonthCount = useMemo(() => {
    const current = monthKey(isoToday());
    return events.filter((e) => monthKey(e.date) === current).length;
  }, [events]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="bg-gradient-to-r from-primary to-secondary bg-clip-text font-heading text-2xl font-bold tracking-tight text-transparent md:text-3xl">
          Dashboard Ekstrakurikuler
        </h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Ringkasan jadwal ekstrakurikuler SMP SMK IDN Akhwat.
        </p>
      </div>

      <motion.div
        variants={fadeInItem}
        initial="hidden"
        animate="show"
        className="card grid grid-cols-2 divide-x divide-outline-variant/40 rounded-xl"
      >
        <div className="p-5">
          <p className="text-xs font-medium text-on-surface-variant">
            Total Jadwal ({monthLabel(monthKey(isoToday()))})
          </p>
          <p className="mt-1 font-heading text-2xl font-bold text-on-surface">
            <AnimatedNumber value={thisMonthCount} />
          </p>
        </div>
        <div className="p-5">
          <p className="text-xs font-medium text-on-surface-variant">Ekstrakurikuler Aktif</p>
          <p className="mt-1 font-heading text-2xl font-bold text-on-surface">
            <AnimatedNumber value={ESKUL_ORDER.length} />
          </p>
        </div>
      </motion.div>

      <motion.section
        variants={fadeInItem}
        initial="hidden"
        animate="show"
        className="card rounded-xl p-6"
      >
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
          <div className="mt-5 ml-[5px] flex flex-col gap-[30px] border-l-2 border-outline-variant/50 pl-[26px]">
            {dayGroups.map((group) => (
              <div key={group.date}>
                <div className="mb-3.5 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant/70">
                  {group.dateLabel}
                </div>
                <motion.div
                  variants={staggerContainer}
                  initial="hidden"
                  animate="show"
                  className="flex flex-col gap-5"
                >
                  {group.events.map((event) => (
                    <WeekTimelineRow
                      key={event.id}
                      event={event}
                      isLive={isEventLiveNow(event)}
                      isPast={isEventPast(event)}
                    />
                  ))}
                </motion.div>
              </div>
            ))}
          </div>
        )}
      </motion.section>
    </div>
  );
}
