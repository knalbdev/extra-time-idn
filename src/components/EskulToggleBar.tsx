"use client";

import { ESKUL_META, ESKUL_ORDER } from "@/lib/constants";
import { EskulKey } from "@/lib/types";
import { EskulIcon } from "./EskulIcon";

export function EskulToggleBar({
  activeEskuls,
  onToggleEskul,
  resultCount,
  totalCount,
}: {
  activeEskuls: Set<EskulKey>;
  onToggleEskul: (eskul: EskulKey) => void;
  resultCount: number;
  totalCount: number;
}) {
  return (
    <div className="glass-card flex flex-wrap items-center justify-between gap-3 rounded-lg p-4">
      <div className="flex flex-wrap gap-2">
        {ESKUL_ORDER.map((key) => {
          const meta = ESKUL_META[key];
          const active = activeEskuls.has(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => onToggleEskul(key)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-150 active:scale-95 ${
                active
                  ? `${meta.chip} shadow-sm`
                  : "bg-surface-container text-on-surface-variant/50 ring-1 ring-outline-variant hover:bg-surface-container-high hover:text-on-surface-variant"
              }`}
            >
              <EskulIcon eskul={key} className="h-3.5 w-3.5" />
              {meta.label}
            </button>
          );
        })}
      </div>

      <p className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-secondary/10 px-3 py-1.5 text-sm text-secondary">
        <span className="font-bold">{resultCount}</span>
        <span className="text-secondary/50">/</span>
        {totalCount} jadwal
      </p>
    </div>
  );
}
