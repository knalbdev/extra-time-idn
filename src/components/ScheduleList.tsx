"use client";

import { useMemo, useState } from "react";
import { dayBadge, formatLongIndo, isoToday, monthKey, monthLabel } from "@/lib/format";
import { EskulEvent } from "@/lib/types";
import { EventCard } from "./EventCard";

function defaultExpandedMonth(keys: string[]): Set<string> {
  if (keys.length === 0) return new Set();
  const current = monthKey(isoToday());
  const defaultKey = keys.includes(current) ? current : (keys.find((k) => k >= current) ?? keys[0]);
  return new Set([defaultKey]);
}

export function ScheduleList({ events }: { events: EskulEvent[] }) {
  const groups = useMemo(() => {
    const byMonth = new Map<string, Map<string, EskulEvent[]>>();
    for (const event of events) {
      const mKey = monthKey(event.date);
      if (!byMonth.has(mKey)) byMonth.set(mKey, new Map());
      const byDate = byMonth.get(mKey)!;
      if (!byDate.has(event.date)) byDate.set(event.date, []);
      byDate.get(event.date)!.push(event);
    }
    return Array.from(byMonth.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mKey, byDate]) => ({
        key: mKey,
        label: monthLabel(mKey),
        count: Array.from(byDate.values()).reduce((n, arr) => n + arr.length, 0),
        dates: Array.from(byDate.entries()).sort(([a], [b]) => a.localeCompare(b)),
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
      <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
        Tidak ada jadwal yang cocok dengan filter saat ini.
      </div>
    );
  }

  const allOpen = groups.length > 0 && groups.every((g) => expanded.has(g.key));

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <button
          type="button"
          onClick={() =>
            setExpanded(allOpen ? new Set() : new Set(groups.map((g) => g.key)))
          }
          className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-50"
        >
          {allOpen ? "Tutup semua bulan" : "Buka semua bulan"}
        </button>
      </div>

      <div className="space-y-3">
        {groups.map((group) => {
          const isOpen = expanded.has(group.key);
          return (
            <section
              key={group.key}
              className={`overflow-hidden rounded-2xl border bg-white transition-colors ${
                isOpen ? "border-indigo-200 shadow-sm" : "border-gray-200"
              }`}
            >
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
                className="flex w-full items-center justify-between px-4 py-3.5 text-left transition hover:bg-gray-50 sm:px-5"
              >
                <span className="flex items-center gap-2.5">
                  <span className="text-sm font-bold uppercase tracking-wide text-indigo-700">
                    {group.label}
                  </span>
                  <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-600">
                    {group.count} jadwal
                  </span>
                </span>
                <svg
                  className={`h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>

              {isOpen && (
                <div className="space-y-5 border-t border-gray-100 px-4 py-4 sm:px-5">
                  {group.dates.map(([date, dayEvents]) => {
                    const badge = dayBadge(date);
                    return (
                      <div key={date} className="flex flex-col gap-3 sm:flex-row sm:gap-4">
                        <div className="flex shrink-0 items-center gap-2.5 sm:w-40 sm:flex-col sm:items-start sm:gap-1.5">
                          <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
                            <span className="text-[9px] font-bold uppercase leading-none">
                              {badge.dayShort}
                            </span>
                            <span className="text-sm font-extrabold leading-none">
                              {badge.dayNum}
                            </span>
                          </div>
                          <p className="text-sm font-semibold text-gray-800">
                            {formatLongIndo(date)}
                          </p>
                        </div>
                        <div className="grid flex-1 grid-cols-1 gap-3 lg:grid-cols-2">
                          {dayEvents.map((event) => (
                            <EventCard key={event.id} event={event} />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
