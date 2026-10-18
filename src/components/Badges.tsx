import { ESKUL_META, STATUS_BUCKET_META, STATUS_META } from "@/lib/constants";
import { EskulKey, StatusKey } from "@/lib/types";

export function EskulChip({ eskul }: { eskul: EskulKey }) {
  const meta = ESKUL_META[eskul];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${meta.chip}`}
    >
      {meta.label}
    </span>
  );
}

export function StatusChip({ status, label }: { status: StatusKey; label?: string }) {
  const meta = STATUS_META[status];
  const bucket = STATUS_BUCKET_META[meta.bucket];
  return (
    <span
      aria-label={`Status pelaksanaan: ${label ?? meta.label}`}
      className={`inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${bucket.badge}`}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${bucket.dot}`} />
      <span className="min-w-0">{label ?? meta.label}</span>
    </span>
  );
}

export function ClassChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-lg border border-outline-variant/60 bg-surface px-2 py-1 text-xs font-medium text-on-surface-variant">
      {label}
    </span>
  );
}
