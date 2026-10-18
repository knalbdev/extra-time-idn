import { EskulIcon } from "./EskulIcon";
import { motion } from "framer-motion";
import { ESKUL_META } from "@/lib/constants";
import { splitTimeForTimeline, summarizeClasses } from "@/lib/format";
import { fadeInItem } from "@/lib/motion";
import { EskulEvent } from "@/lib/types";
import { StatusChip } from "./Badges";
import { Icon } from "./Icon";

export function WeekTimelineRow({ event }: { event: EskulEvent }) {
  const { clock, note: timeNote } = splitTimeForTimeline(event.time);
  const classLabels = summarizeClasses(event.classes);
  const time = [clock !== "—" ? clock : null, timeNote].filter(Boolean).join(" · ");
  const statusLabel = event.status.trim() || "Status belum diisi";

  return (
    <motion.div variants={fadeInItem} className="relative flex items-start gap-3 rounded-2xl border border-outline-variant/60 bg-surface/50 p-4 sm:gap-4 sm:p-5">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${ESKUL_META[event.eskul].iconBg}`}><EskulIcon eskul={event.eskul} className={`h-5 w-5 ${ESKUL_META[event.eskul].iconColor}`} /></span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <span className="text-sm font-semibold text-on-surface sm:text-base">{event.eskulLabel}</span>
          <span className="max-w-full [&>span]:whitespace-normal [&>span]:break-words"><StatusChip status={event.statusNormalized} label={statusLabel} /></span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs leading-relaxed text-on-surface-variant">
          {classLabels.length > 0 && <span className="min-w-0 break-words">{classLabels.join(", ")}</span>}
          {time && <span className="inline-flex min-w-0 items-start gap-1.5"><Icon name="schedule" className="mt-0.5 shrink-0 text-sm" /><span className="break-words tabular-nums">{time}</span></span>}
        </div>
      </div>
    </motion.div>
  );
}
