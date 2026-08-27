import { motion } from "framer-motion";
import { STATUS_META } from "@/lib/constants";
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
    <motion.div variants={fadeInItem} className="relative flex items-start gap-[18px]">
      <span
        className={`absolute -left-[31px] top-[5px] h-2.5 w-2.5 rounded-full border-2 ${
          isLive ? "border-primary bg-primary" : "border-outline-variant bg-white"
        }`}
      />
      <span className="tabular-nums w-[58px] shrink-0 font-heading text-base font-extrabold text-on-surface-variant">
        {clock}
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[14.5px] font-semibold text-on-surface">{event.eskulLabel}</span>
        {sub && <span className="text-[12.5px] text-on-surface-variant">{sub}</span>}
      </div>
    </motion.div>
  );
}
