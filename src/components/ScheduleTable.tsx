"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import { ESKUL_META } from "@/lib/constants";
import { dayBadge, isoToday, monthKey, monthLabel, summarizeClasses } from "@/lib/format";
import { fadeInItem, staggerContainer, staggerContainerFast } from "@/lib/motion";
import { EskulEvent } from "@/lib/types";
import { ClassChip, StatusChip } from "./Badges";
import { EskulIcon } from "./EskulIcon";
import { Icon } from "./Icon";

function defaultExpandedMonth(keys: string[]): Set<string> {
  if (keys.length === 0) return new Set();
  const current = monthKey(isoToday());
  const defaultKey = keys.includes(current) ? current : (keys.find((k) => k >= current) ?? keys[0]);
  return new Set([defaultKey]);
}

export function ScheduleTable({
  events,
  onClearFilters,
}: {
  events: EskulEvent[];
  onClearFilters: () => void;
}) {
  const groups = useMemo(() => {
    const byMonth = new Map<string, EskulEvent[]>();
    for (const event of events) {
      const mKey = monthKey(event.date);
      if (!byMonth.has(mKey)) byMonth.set(mKey, []);
      byMonth.get(mKey)!.push(event);
    }
    return Array.from(byMonth.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mKey, monthEvents]) => ({
        key: mKey,
        label: monthLabel(mKey),
        events: [...monthEvents].sort(
          (a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time),
        ),
      }));
  }, [events]);

  const groupKeysSignature = groups.map((g) => g.key).join("|");
  const [expanded, setExpanded] = useState<Set<string>>(() =>
    defaultExpandedMonth(groups.map((g) => g.key)),
  );
  const [trackedSignature, setTrackedSignature] = useState(groupKeysSignature);

  // Re-derive which month is open by default whenever the set of visible
  // months changes (e.g. a filter was applied) — adjusted during render, per
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  if (groupKeysSignature !== trackedSignature) {
    setTrackedSignature(groupKeysSignature);
    setExpanded(defaultExpandedMonth(groups.map((g) => g.key)));
  }

  if (events.length === 0) {
    return (
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="card flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-outline-variant/60 p-12 text-center"
      >
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        >
          <Icon name="event_busy" className="mb-4 text-5xl text-outline" />
        </motion.div>
        <h3 className="text-lg font-heading font-semibold text-on-surface">
          Tidak ada jadwal ditemukan
        </h3>
        <p className="mt-2 max-w-md text-sm text-on-surface-variant">
          Coba ubah filter bulan, kelas, atau ekstrakurikuler untuk melihat jadwal yang tersedia.
        </p>
        <motion.button
          type="button"
          onClick={onClearFilters}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
          className="mt-6 rounded-lg border border-outline px-4 py-2 text-sm font-semibold text-primary transition hover:bg-surface-container"
        >
          Hapus Filter
        </motion.button>
      </motion.section>
    );
  }

  const allOpen = groups.length > 0 && groups.every((g) => expanded.has(g.key));

  return (
    <section className="card overflow-hidden rounded-xl">
      <div className="flex items-center justify-between border-b border-outline-variant/40 px-5 py-3.5">
        <h2 className="text-lg font-heading font-semibold text-primary">Jadwal Terperinci</h2>
        <motion.button
          type="button"
          onClick={() =>
            setExpanded(allOpen ? new Set() : new Set(groups.map((g) => g.key)))
          }
          whileTap={{ scale: 0.94 }}
          className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-secondary transition hover:bg-secondary/10"
        >
          {allOpen ? "Tutup semua bulan" : "Buka semua bulan"}
        </motion.button>
      </div>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="divide-y divide-outline-variant/30"
      >
        {groups.map((group) => {
          const isOpen = expanded.has(group.key);
          return (
            <motion.div key={group.key} variants={fadeInItem}>
              <button
                type="button"
                onClick={() =>
                  setExpanded((prev) => {
                    const next = new Set(prev);
                    if (next.has(group.key)) next.delete(group.key);
                    else next.add(group.key);
                    return next;
                  })
                }
                aria-expanded={isOpen}
                className={`flex w-full items-center justify-between px-5 py-3 text-left transition hover:bg-secondary/5 ${
                  isOpen ? "bg-secondary/5" : ""
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <span className="text-sm font-bold uppercase tracking-wide text-primary">
                    {group.label}
                  </span>
                  <span className="rounded-full bg-secondary/10 px-2 py-0.5 text-xs font-semibold text-secondary">
                    {group.events.length} jadwal
                  </span>
                </span>
                <motion.span
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 22 }}
                >
                  <Icon name="expand_more" className="text-xl text-on-surface-variant" />
                </motion.span>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    key="content"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden border-t border-outline-variant/30"
                  >
                  {/* Stacked cards on small screens — a horizontally-scrolling table
                      doesn't work well with one-thumb use on a phone. */}
                  <motion.div
                    variants={staggerContainerFast}
                    initial="hidden"
                    animate="show"
                    className="divide-y divide-outline-variant/20 md:hidden"
                  >
                    {group.events.map((event) => {
                      const meta = ESKUL_META[event.eskul];
                      const badge = dayBadge(event.date);
                      const classLabels = summarizeClasses(event.classes);
                      return (
                        <motion.div
                          key={event.id}
                          variants={fadeInItem}
                          className="flex flex-col gap-2 p-4"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2.5">
                              <span
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${meta.iconBg}`}
                              >
                                <EskulIcon eskul={event.eskul} className={`h-4 w-4 ${meta.iconColor}`} />
                              </span>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-on-surface">{event.eskulLabel}</p>
                                <p className="text-xs text-on-surface-variant">
                                  {badge.dayShort}, {badge.dayNum} &middot; {event.time}
                                </p>
                              </div>
                            </div>
                            <StatusChip status={event.statusNormalized} />
                          </div>
                          {classLabels.length > 0 ? (
                            <div className="flex flex-wrap gap-1 pl-[42px]">
                              {classLabels.map((c) => (
                                <ClassChip key={c} label={c} />
                              ))}
                            </div>
                          ) : null}
                          {(event.teacher || event.notes) && (
                            <p className="pl-[42px] text-xs text-on-surface-variant/80">
                              {[event.teacher, event.notes].filter(Boolean).join(" — ")}
                            </p>
                          )}
                        </motion.div>
                      );
                    })}
                  </motion.div>

                  {/* Full table from md up, where the width fits without scrolling. */}
                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-outline-variant/30">
                          <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">
                            Tanggal
                          </th>
                          <th className="px-3 py-3 text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">
                            Waktu
                          </th>
                          <th className="px-3 py-3 text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">
                            Kegiatan
                          </th>
                          <th className="px-3 py-3 text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">
                            Kelas
                          </th>
                          <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.events.map((event) => {
                          const meta = ESKUL_META[event.eskul];
                          const badge = dayBadge(event.date);
                          const detail = [event.teacher, event.notes].filter(Boolean).join(" — ");
                          const classLabels = summarizeClasses(event.classes);
                          return (
                            <tr
                              key={event.id}
                              className="border-b border-outline-variant/20 align-top transition hover:bg-surface-container-lowest"
                            >
                              <td className="whitespace-nowrap px-5 py-3 text-sm">
                                <span className="font-semibold text-on-surface">
                                  {badge.dayShort}, {badge.dayNum}
                                </span>
                              </td>
                              <td className="whitespace-nowrap px-3 py-3 text-sm text-on-surface-variant">
                                {event.time}
                              </td>
                              <td className="px-3 py-3">
                                <div className="flex items-start gap-2" title={detail || undefined}>
                                  <span
                                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${meta.iconBg}`}
                                  >
                                    <EskulIcon eskul={event.eskul} className={`h-3.5 w-3.5 ${meta.iconColor}`} />
                                  </span>
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold text-on-surface">{event.eskulLabel}</p>
                                    {event.extra && !event.extra.startsWith("Sesi") ? (
                                      <p className="text-xs text-on-surface-variant">{event.extra}</p>
                                    ) : null}
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-3">
                                {classLabels.length > 0 ? (
                                  <div className="flex max-w-[220px] flex-wrap gap-1">
                                    {classLabels.map((c) => (
                                      <ClassChip key={c} label={c} />
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-xs italic text-on-surface-variant/70">
                                    Belum ditentukan
                                  </span>
                                )}
                              </td>
                              <td className="px-5 py-3 text-right">
                                <StatusChip status={event.statusNormalized} />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </motion.div>
    </section>
  );
}
