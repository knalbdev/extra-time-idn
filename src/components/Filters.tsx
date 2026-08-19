"use client";

import { CLASS_LIST, ESKUL_META, ESKUL_ORDER } from "@/lib/constants";
import { EskulKey } from "@/lib/types";
import { EskulIcon } from "./EskulIcon";

export interface MonthOption {
  key: string;
  label: string;
}

function SelectChevron() {
  return (
    <svg
      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

const selectClass =
  "w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm font-medium text-gray-900 transition focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100";

export function Filters({
  months,
  selectedMonth,
  onMonthChange,
  selectedClass,
  onClassChange,
  activeEskuls,
  onToggleEskul,
  resultCount,
  totalCount,
}: {
  months: MonthOption[];
  selectedMonth: string;
  onMonthChange: (v: string) => void;
  selectedClass: string;
  onClassChange: (v: string) => void;
  activeEskuls: Set<EskulKey>;
  onToggleEskul: (eskul: EskulKey) => void;
  resultCount: number;
  totalCount: number;
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1.5 block font-semibold text-gray-700">Periode Bulan</span>
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
              <SelectChevron />
            </div>
          </label>

          <label className="block text-sm">
            <span className="mb-1.5 block font-semibold text-gray-700">Kelas</span>
            <div className="relative">
              <select
                value={selectedClass}
                onChange={(e) => onClassChange(e.target.value)}
                className={selectClass}
              >
                <option value="all">Semua Kelas</option>
                {CLASS_LIST.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <SelectChevron />
            </div>
          </label>
        </div>

        <p className="whitespace-nowrap text-sm text-gray-500">
          Menampilkan <span className="font-bold text-indigo-600">{resultCount}</span> dari{" "}
          {totalCount} jadwal
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {ESKUL_ORDER.map((key) => {
          const meta = ESKUL_META[key];
          const active = activeEskuls.has(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => onToggleEskul(key)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                active
                  ? meta.chip
                  : "bg-gray-100 text-gray-400 ring-1 ring-gray-200 hover:bg-gray-200"
              }`}
            >
              <EskulIcon eskul={key} className="h-3.5 w-3.5" />
              {meta.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
