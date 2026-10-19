"use client";

import { ESKUL_META } from "@/lib/constants";
import type { EskulKey } from "@/lib/types";
import { useExtracurriculars } from "./ExtracurricularProvider";
import { EskulIcon } from "./EskulIcon";

export function ScheduleControls({ activeEskuls, onToggleEskul, resultCount }: {
  activeEskuls: Set<EskulKey>;
  onToggleEskul: (eskul: EskulKey) => void;
  resultCount: number;
}) {
  const { enabledEskuls } = useExtracurriculars();
  return <div aria-label="Filter ekstrakurikuler" role="group" className="flex flex-wrap items-center justify-between gap-3">
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-[11px] font-semibold text-on-surface-variant">Pilih eskul</span>
      {enabledEskuls.map(key => {
        const meta = ESKUL_META[key];
        return <button key={key} type="button" aria-pressed={activeEskuls.has(key)} onClick={() => onToggleEskul(key)} className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary ${activeEskuls.has(key) ? meta.chip : "bg-surface text-on-surface-variant/60 ring-1 ring-outline-variant hover:bg-surface-container"}`}><EskulIcon eskul={key} className="h-4 w-4" />{meta.label}</button>;
      })}
    </div>
    <p className="text-[11px] text-on-surface-variant"><span className="font-semibold text-primary">{resultCount}</span> kegiatan ditampilkan</p>
  </div>;
}
