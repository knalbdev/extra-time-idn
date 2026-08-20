import { formatLongIndo, isoToday, weekRangeOf } from "./format";
import { EskulEvent } from "./types";

export function computeWeekHighlight(events: EskulEvent[]): {
  rangeLabel: string;
  weekEvents: EskulEvent[];
  fallback: boolean;
} {
  const today = isoToday();
  const range = weekRangeOf(today);
  const rangeLabel = `${formatLongIndo(range.start)} – ${formatLongIndo(range.end)}`;
  const inWeek = events
    .filter((e) => e.date >= range.start && e.date <= range.end)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (inWeek.length > 0) {
    return { rangeLabel, weekEvents: inWeek, fallback: false };
  }

  const upcoming = events
    .filter((e) => e.date > range.end)
    .sort((a, b) => a.date.localeCompare(b.date));
  const nextDate = upcoming[0]?.date;
  const nextBatch = nextDate ? upcoming.filter((e) => e.date === nextDate) : [];

  return { rangeLabel, weekEvents: nextBatch, fallback: true };
}

export function nextUpcomingEvent(events: EskulEvent[]): EskulEvent | null {
  const today = isoToday();
  const upcoming = events
    .filter(
      (e) =>
        e.date >= today &&
        e.statusNormalized !== "ditiadakan" &&
        e.statusNormalized !== "libur",
    )
    .sort((a, b) => a.date.localeCompare(b.date));
  return upcoming[0] ?? null;
}
