import { EskulIcon } from "./EskulIcon";
import { motion } from "framer-motion";
import { ESKUL_META, STATUS_META } from "@/lib/constants";
import { splitTimeForTimeline, summarizeClasses } from "@/lib/format";
import { fadeInItem } from "@/lib/motion";
import { EskulEvent } from "@/lib/types";

export function WeekTimelineRow({
  event,
  isLive = false,
  isPast = false,
}: {
  event: EskulEvent;
  isLive?: boolean;
  isPast?: boolean;
}) {
  const { clock, note: timeNote } = splitTimeForTimeline(event.time);
  const classLabels = summarizeClasses(event.classes);
  const statusLabel =
    event.statusNormalized !== "terjadwal"
      ? STATUS_META[event.statusNormalized].label
      : isPast
        ? STATUS_META.selesai.label
        : null;
  const sub = [classLabels.join(", "), statusLabel, timeNote].filter(Boolean).join(" · ");

  return (
    <motion.div variants={fadeInItem} className="relative flex items-center gap-3 rounded-xl border border-outline-variant/50 bg-surface/50 p-3 sm:p-4">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${ESKUL_META[event.eskul].iconBg}`}><EskulIcon eskul={event.eskul} className={`h-5 w-5 ${ESKUL_META[event.eskul].iconColor}`} /></span>
      <span className="tabular-nums w-[52px] shrink-0 font-heading text-sm font-bold text-on-surface-variant">
        {clock}
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[14.5px] font-semibold text-on-surface">{event.eskulLabel}</span>
        {sub && <span className="text-[12.5px] text-on-surface-variant">{sub}</span>}
      </div>
      {isLive && <span className="ml-auto rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-700">Berlangsung</span>}
    </motion.div>
  );
}
