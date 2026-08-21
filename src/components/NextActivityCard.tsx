"use client";

import { motion } from "framer-motion";
import { ESKUL_META } from "@/lib/constants";
import { summarizeClasses } from "@/lib/format";
import { EskulEvent } from "@/lib/types";
import { EskulIcon } from "./EskulIcon";

export function NextActivityCard({ event }: { event: EskulEvent | null }) {
  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-outline-variant/60 bg-white/60 p-6 text-center text-sm text-on-surface-variant">
        Belum ada jadwal berikutnya.
      </div>
    );
  }

  const meta = ESKUL_META[event.eskul];
  const classLabels = summarizeClasses(event.classes);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -3, boxShadow: "0 14px 28px -10px rgba(3,34,77,0.45)" }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className="relative isolate overflow-hidden rounded-xl bg-primary p-6 text-on-primary"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.1]"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)",
          backgroundSize: "18px 18px",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-sky-400/20 blur-[70px]"
      />

      <div className="relative flex items-center gap-2">
        <motion.span
          initial={{ rotate: -12, scale: 0.6 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.1 }}
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${meta.iconBg}`}
        >
          <EskulIcon eskul={event.eskul} className={`h-4 w-4 ${meta.iconColor}`} />
        </motion.span>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-on-primary/70">
          Jadwal Terdekat
        </p>
      </div>

      <div className="mt-3 font-heading text-3xl font-bold tracking-tight">
        {event.eskulLabel}
      </div>
      <p className="mt-1 text-sm text-on-primary/80">
        {event.dateLabel} &middot; {event.time}
      </p>

      {classLabels.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {classLabels.map((c) => (
            <span
              key={c}
              className="inline-block rounded-md bg-white/15 px-2.5 py-1 text-xs font-semibold text-on-primary"
            >
              {c}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  );
}
