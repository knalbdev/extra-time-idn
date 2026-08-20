import { summarizeClasses } from "@/lib/format";
import { EskulEvent } from "@/lib/types";
import { Icon } from "./Icon";

export function NextActivityCard({ event }: { event: EskulEvent | null }) {
  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-outline-variant/60 bg-white/60 p-6 text-center text-sm text-on-surface-variant">
        Belum ada jadwal berikutnya.
      </div>
    );
  }

  const classLabels = summarizeClasses(event.classes);

  return (
    <div className="relative overflow-hidden rounded-xl border border-primary/10 bg-gradient-to-br from-primary-container to-primary p-6 text-center text-on-primary shadow-md">
      <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 opacity-10">
        <Icon name="sports_score" className="text-[120px]" />
      </div>

      <h4 className="relative mb-2 text-[11px] font-semibold uppercase tracking-wider text-on-primary/80">
        Next Activity
      </h4>
      <div className="relative font-heading text-4xl font-bold tracking-tight">
        {event.eskulLabel}
      </div>
      <p className="relative mb-4 mt-1 text-base text-on-primary/90">
        {event.dateLabel} &middot; {event.time}
      </p>

      {classLabels.length > 0 && (
        <div className="relative flex flex-wrap items-center justify-center gap-1.5">
          {classLabels.map((c) => (
            <span
              key={c}
              className="inline-block rounded-lg bg-white/20 px-3 py-1.5 text-xs font-semibold text-on-primary backdrop-blur-sm"
            >
              {c}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
