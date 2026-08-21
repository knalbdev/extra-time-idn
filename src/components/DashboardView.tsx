"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";
import { ESKUL_ORDER } from "@/lib/constants";
import { isoToday, monthKey, monthLabel } from "@/lib/format";
import { fadeInItem, staggerContainer } from "@/lib/motion";
import { computeWeekHighlight, nextUpcomingEvent } from "@/lib/schedule";
import { EskulEvent } from "@/lib/types";
import { NextActivityCard } from "./NextActivityCard";
import { StatCard } from "./StatCard";
import { WeekActivityCard } from "./WeekActivityCard";

export function DashboardView({ events }: { events: EskulEvent[] }) {
  const { rangeLabel, weekEvents, fallback } = useMemo(
    () => computeWeekHighlight(events),
    [events],
  );

  const next = useMemo(() => nextUpcomingEvent(events), [events]);

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
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 gap-6 lg:grid-cols-3"
      >
        <motion.section variants={fadeInItem} className="card rounded-xl p-6 lg:col-span-2">
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
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="show"
              className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2"
            >
              {weekEvents.map((event) => (
                <WeekActivityCard key={event.id} event={event} />
              ))}
            </motion.div>
          )}
        </motion.section>

        <div className="space-y-4">
          <motion.div variants={fadeInItem}>
            <NextActivityCard event={next} />
          </motion.div>
          <motion.div variants={fadeInItem}>
            <StatCard
              label={`Total Jadwal (${monthLabel(monthKey(isoToday()))})`}
              value={thisMonthCount}
              icon="bar_chart"
              iconBg="bg-sky-100"
              iconColor="text-sky-600"
            />
          </motion.div>
          <motion.div variants={fadeInItem}>
            <StatCard
              label="Ekstrakurikuler Aktif"
              value={ESKUL_ORDER.length}
              icon="groups"
              iconBg="bg-amber-100"
              iconColor="text-amber-600"
            />
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
