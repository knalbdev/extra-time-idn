"use client";

import { useCallback, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ESKUL_META } from "@/lib/constants";
import { formatLongIndo } from "@/lib/format";
import type { EskulEvent } from "@/lib/types";
import { ClassChip, StatusChip } from "./Badges";
import { EskulIcon } from "./EskulIcon";
import { Icon } from "./Icon";

export type CalendarDaySelection = { date: string; anchor: HTMLButtonElement };

export function CalendarDayPopover({ id, selection, events, onDismiss }: {
  id: string;
  selection: CalendarDaySelection;
  events: EskulEvent[];
  onDismiss: (selection: CalendarDaySelection) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);
  const close = useCallback(() => onDismiss(selection), [onDismiss, selection]);

  useLayoutEffect(() => {
    const panel = ref.current;
    if (!panel) return;
    const { anchor } = selection;
    const position = () => {
      const viewport = window.visualViewport;
      const width = viewport?.width ?? window.innerWidth;
      const height = viewport?.height ?? window.innerHeight;
      const leftEdge = viewport?.offsetLeft ?? 0;
      const topEdge = viewport?.offsetTop ?? 0;
      const margin = 12;
      panel.style.width = `${Math.min(420, width - margin * 2)}px`;
      panel.style.maxHeight = `${Math.min(560, height - margin * 2)}px`;
      const anchorBox = anchor.getBoundingClientRect();
      const box = panel.getBoundingClientRect();
      const desiredLeft = width < 640 ? leftEdge + (width - box.width) / 2
        : anchorBox.right + box.width + margin * 2 <= leftEdge + width ? anchorBox.right + margin : anchorBox.left - box.width - margin;
      const desiredTop = width < 640 ? anchorBox.bottom + margin : anchorBox.top;
      panel.style.left = `${Math.max(leftEdge + margin, Math.min(desiredLeft, leftEdge + width - box.width - margin))}px`;
      panel.style.top = `${Math.max(topEdge + margin, Math.min(desiredTop, topEdge + height - box.height - margin))}px`;
    };
    panel.showPopover();
    position();
    closeRef.current?.focus({ preventScroll: true });
    const observer = new ResizeObserver(position);
    observer.observe(panel);
    observer.observe(anchor);
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    window.visualViewport?.addEventListener("resize", position);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
      window.visualViewport?.removeEventListener("resize", position);
    };
  }, [selection]);

  function dismissWithFocus() {
    selection.anchor.focus({ preventScroll: true });
    close();
  }

  return createPortal(<div ref={ref} id={id} popover="auto" role="dialog" aria-labelledby={`${id}-title`} tabIndex={-1}
    onKeyDown={event => { if (event.key === "Escape") restoreFocus.current = true; }}
    onToggle={event => { if (event.newState === "closed") { if (restoreFocus.current && selection.anchor.isConnected) selection.anchor.focus({ preventScroll: true }); close(); } }}
    className="fixed inset-auto m-0 overflow-y-auto overscroll-contain rounded-2xl border border-outline-variant bg-white p-0 text-primary shadow-[0_16px_64px_-12px_rgba(16,37,68,0.35)]">
    <header className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-outline-variant/50 bg-white px-5 py-4">
      <div><p className="eyebrow">AGENDA KEGIATAN</p><h3 id={`${id}-title`} className="mt-1 font-heading text-base font-bold">{formatLongIndo(selection.date)}</h3><p className="mt-1 text-xs text-on-surface-variant">{events.length} kegiatan · Waktu Indonesia Barat</p></div>
      <button ref={closeRef} type="button" aria-label="Tutup rincian kegiatan" onClick={dismissWithFocus} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"><Icon name="close" className="text-xl" /></button>
    </header>
    {!events.length ? <div className="flex items-start gap-3 p-5"><Icon name="event_available" className="text-2xl text-outline" /><p className="text-sm leading-relaxed text-on-surface-variant">Tidak ada kegiatan pada tanggal ini sesuai filter yang dipilih.</p></div> : <ul className="divide-y divide-outline-variant/50">{events.map(event => {
      const meta = ESKUL_META[event.eskul];
      return <li key={event.id} className="min-w-0 p-5">
        <div className="flex items-start gap-3"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${meta.iconBg}`}><EskulIcon eskul={event.eskul} className={`h-4 w-4 ${meta.iconColor}`} /></span><div className="min-w-0 flex-1"><h4 className="text-sm font-bold">{event.eskulLabel}</h4><p className="mt-1 break-words text-xs text-on-surface-variant">{event.time || "Waktu belum dicantumkan"}</p></div></div>
        <div className="mt-3 max-w-full [&_span]:whitespace-normal [&_span]:break-words"><StatusChip status={event.statusNormalized} label={event.status.trim() || "Status belum diisi"} /></div>
        <p className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant">Kelas peserta</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">{event.classes.map(name => <ClassChip key={name} label={name} />)}{!event.classes.length && <p className="text-xs text-on-surface-variant">Belum dicantumkan</p>}</div>
        {(event.teacher || event.notes) && <p className="mt-3 break-words text-xs leading-relaxed text-on-surface-variant">{[event.teacher, event.notes].filter(Boolean).join(" · ")}</p>}
      </li>;
    })}</ul>}
  </div>, document.body);
}
