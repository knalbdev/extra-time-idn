import { ESKUL_META, STATUS_META } from "@/lib/constants";
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

export function StatusChip({ status }: { status: StatusKey }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${meta.chip}`}
    >
      {meta.label}
    </span>
  );
}

export function ClassChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
      {label}
    </span>
  );
}
