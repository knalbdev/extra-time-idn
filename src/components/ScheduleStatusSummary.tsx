import { STATUS_BUCKET_META, STATUS_META } from "@/lib/constants";
import type { EskulEvent, StatusBucket } from "@/lib/types";

export function ScheduleStatusSummary({ events, period }: { events: EskulEvent[]; period: string }) {
  const buckets: StatusBucket[] = ["completed", "upcoming", "canceled"];
  const counts = { completed: 0, upcoming: 0, canceled: 0 };
  for (const event of events) counts[STATUS_META[event.statusNormalized].bucket]++;

  return <section aria-label="Ringkasan status jadwal">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold text-primary">Ringkasan status · {period}</h3><p className="text-[11px] text-on-surface-variant">Sesuai filter kelas dan eskul</p></div>
    <dl className="mt-4 grid gap-4 sm:grid-cols-3">{buckets.map(key => {
      const meta = STATUS_BUCKET_META[key];
      const percent = events.length ? Math.round(counts[key] / events.length * 100) : 0;
      return <div key={key} className="min-w-0"><div className="flex items-center justify-between gap-2"><dt className="text-xs text-on-surface-variant">{meta.label}</dt><dd className="whitespace-nowrap text-xs font-bold text-primary">{counts[key]} <span className="font-normal text-on-surface-variant">· {percent}%</span></dd></div><div aria-hidden className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-container"><div className={`h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none ${meta.dot}`} style={{width:`${percent}%`}} /></div></div>;
    })}</dl>
    {!events.length && <p className="mt-3 text-xs text-on-surface-variant">Belum ada kegiatan sesuai filter pada periode ini.</p>}
  </section>;
}
