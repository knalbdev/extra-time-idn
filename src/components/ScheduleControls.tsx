"use client";

import { motion } from "framer-motion";
import { ESKUL_META, ESKUL_ORDER, STATUS_BUCKET_META } from "@/lib/constants";
import { EskulKey, StatusBucket } from "@/lib/types";
import { AnimatedNumber } from "./AnimatedNumber";
import { EskulIcon } from "./EskulIcon";
import { Icon } from "./Icon";

const BUCKET_ORDER: StatusBucket[] = ["completed", "upcoming", "canceled"];

export function ScheduleControls({
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
    <div className="card rounded-lg">
      <div className="flex flex-col gap-2.5 p-4">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
          <Icon name="filter_alt" className="text-sm" />
          Filter Ekstrakurikuler
          <span className="font-normal normal-case text-on-surface-variant/60">
            &middot; klik untuk tampilkan/sembunyikan
          </span>
        </span>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {ESKUL_ORDER.map((key) => {
              const meta = ESKUL_META[key];
              const active = activeEskuls.has(key);
              return (
                <motion.button
                  key={key}
                  type="button"
                  onClick={() => onToggleEskul(key)}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.94 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
                    active
                      ? `${meta.chip} shadow-sm`
                      : "bg-surface-container text-on-surface-variant/50 ring-1 ring-outline-variant hover:bg-surface-container-high hover:text-on-surface-variant"
                  }`}
                >
                  <EskulIcon eskul={key} className="h-3.5 w-3.5" />
                  {meta.label}
                </motion.button>
              );
            })}
          </div>

          <p className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-secondary/10 px-3 py-1.5 text-sm text-secondary">
            <span className="font-bold">
              <AnimatedNumber value={resultCount} />
            </span>
            <span className="text-secondary/50">/</span>
            <AnimatedNumber value={totalCount} /> jadwal
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-outline-variant/40 px-4 py-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
          Keterangan:
        </span>
        {BUCKET_ORDER.map((key) => {
          const meta = STATUS_BUCKET_META[key];
          return (
            <span key={key} className="inline-flex items-center gap-1.5 text-xs text-on-surface-variant">
              <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
              {meta.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
