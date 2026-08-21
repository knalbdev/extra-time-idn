import { motion } from "framer-motion";
import { ESKUL_META } from "@/lib/constants";
import { summarizeClasses } from "@/lib/format";
import { fadeInItem } from "@/lib/motion";
import { EskulEvent } from "@/lib/types";
import { ClassChip, StatusChip } from "./Badges";
import { EskulIcon } from "./EskulIcon";

export function WeekActivityCard({ event }: { event: EskulEvent }) {
  const meta = ESKUL_META[event.eskul];
  const classLabels = summarizeClasses(event.classes);
  const shownClasses = classLabels.slice(0, 4);
  const hiddenCount = classLabels.length - shownClasses.length;

  return (
    <motion.div
      variants={fadeInItem}
      whileHover={{ y: -3, boxShadow: "0 10px 22px -8px rgba(3,34,77,0.2)" }}
      transition={{ type: "spring", stiffness: 320, damping: 24 }}
      className={`flex items-start gap-3 rounded-xl border border-l-4 border-outline-variant/50 bg-white p-3.5 ${meta.border}`}
    >
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${meta.iconBg}`}>
        <EskulIcon eskul={event.eskul} className={`h-4 w-4 ${meta.iconColor}`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
          <p className="text-sm font-bold text-on-surface">{event.eskulLabel}</p>
          <StatusChip status={event.statusNormalized} />
        </div>
        <p className="text-xs text-on-surface-variant">{event.dateLabel}</p>
        {classLabels.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {shownClasses.map((c) => (
              <ClassChip key={c} label={c} />
            ))}
            {hiddenCount > 0 && (
              <span className="inline-flex items-center px-1 text-[11px] font-medium text-on-surface-variant/60">
                +{hiddenCount}
              </span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
