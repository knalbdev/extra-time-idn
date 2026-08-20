import { STATUS_BUCKET_META } from "@/lib/constants";
import { StatusBucket } from "@/lib/types";

const BUCKET_ORDER: StatusBucket[] = ["completed", "upcoming", "canceled"];

export function StatusLegend() {
  return (
    <div className="glass-card flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg p-4">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
        Status Legend:
      </span>
      {BUCKET_ORDER.map((key) => {
        const meta = STATUS_BUCKET_META[key];
        return (
          <div key={key} className="flex items-center gap-2">
            <span className={`h-3 w-3 rounded-full ${meta.dot}`} />
            <span className="text-sm font-medium text-on-surface">{meta.label}</span>
          </div>
        );
      })}
    </div>
  );
}
