"use client";

import { useState } from "react";
import { ESKUL_META } from "@/lib/constants";
import { formatShortIndo } from "@/lib/format";
import { EskulEvent } from "@/lib/types";
import { ClassChip, StatusChip } from "./Badges";
import { EskulIcon } from "./EskulIcon";

export function EventCard({
  event,
  highlight = false,
}: {
  event: EskulEvent;
  highlight?: boolean;
}) {
  const meta = ESKUL_META[event.eskul];
  const hasDetails = Boolean(event.teacher || event.notes);
  const [open, setOpen] = useState(false);

  return (
    <div
      className={`group rounded-2xl border border-l-4 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${
        highlight ? `${meta.ring} ${meta.border} ${meta.soft}` : `border-gray-200 ${meta.border}`
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105 ${meta.iconBg}`}
        >
          <EskulIcon eskul={event.eskul} className={`h-5 w-5 ${meta.iconColor}`} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900">{event.eskulLabel}</p>
              {event.extra && !event.extra.startsWith("Sesi") ? (
                <p className="text-xs text-gray-400">{event.extra}</p>
              ) : null}
            </div>
            <StatusChip status={event.statusNormalized} />
          </div>

          <p className="mt-2 text-sm font-semibold text-gray-800">{event.dateLabel}</p>
          <p className="text-xs text-gray-500">
            {formatShortIndo(event.date)} &middot; {event.time}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {event.classes.length > 0 ? (
          event.classes.map((c) => <ClassChip key={c} label={c} />)
        ) : (
          <span className="text-xs italic text-gray-400">Kelas belum ditentukan</span>
        )}
      </div>

      {hasDetails && (
        <>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="mt-3 flex w-full items-center justify-between border-t border-gray-100 pt-2.5 text-xs font-semibold text-gray-500 transition hover:text-indigo-600"
          >
            <span>{open ? "Sembunyikan detail" : "Lihat detail"}</span>
            <svg
              className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
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
          {open && (
            <div className="mt-2 space-y-1 rounded-lg bg-gray-50 p-2.5 text-xs text-gray-600">
              {event.teacher && (
                <p>
                  <span className="font-medium text-gray-500">Pendamping:</span> {event.teacher}
                </p>
              )}
              {event.notes && (
                <p>
                  <span className="font-medium text-gray-500">Catatan:</span> {event.notes}
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
