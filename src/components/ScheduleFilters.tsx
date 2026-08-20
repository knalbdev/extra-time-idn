"use client";

import { CLASS_GROUPS } from "@/lib/constants";
import { Icon } from "./Icon";

export interface MonthOption {
  key: string;
  label: string;
}

const selectClass =
  "w-full appearance-none rounded-lg border border-outline-variant bg-white px-3.5 py-2.5 pr-9 text-sm font-medium text-on-surface transition hover:border-secondary/50 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/15";

export function ScheduleFilters({
  months,
  selectedMonth,
  onMonthChange,
  selectedClass,
  onClassChange,
}: {
  months: MonthOption[];
  selectedMonth: string;
  onMonthChange: (v: string) => void;
  selectedClass: string;
  onClassChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="block w-full text-sm sm:w-44">
        <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">
          Bulan
        </span>
        <div className="relative">
          <select
            value={selectedMonth}
            onChange={(e) => onMonthChange(e.target.value)}
            className={selectClass}
          >
            <option value="all">Semua Bulan</option>
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
          Kelas
        </span>
        <div className="relative">
          <select
            value={selectedClass}
            onChange={(e) => onClassChange(e.target.value)}
            className={selectClass}
          >
            <option value="all">Semua Kelas</option>
            {CLASS_GROUPS.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.classes.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <Icon
            name="expand_more"
            className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-lg text-on-surface-variant"
          />
        </div>
      </label>
    </div>
  );
}
