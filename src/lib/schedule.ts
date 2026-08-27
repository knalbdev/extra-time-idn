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

const PANAHAN_DURATION_MIN = 60;

function parseClockToMinutes(raw: string): number | null {
  const m = raw.trim().match(/^(\d{1,2})[.,:](\d{2})$/);
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

/**
 * Whether an event's session is happening right now. Only eskul with a
 * reliable clock time can be computed this way — Renang ("Ba'da Ashar", tied
 * to prayer time) and Berkuda (only a departure time, no session length)
 * never report live.
 */
export function isEventLiveNow(event: EskulEvent, now: Date = new Date()): boolean {
  if (event.date !== isoToday()) return false;
  const nowMin = now.getHours() * 60 + now.getMinutes();

  if (event.eskul === "panahan") {
    const start = parseClockToMinutes(event.time);
    if (start === null) return false;
    return nowMin >= start && nowMin < start + PANAHAN_DURATION_MIN;
  }

  if (event.eskul === "taekwondo" || event.eskul === "pramuka") {
    const [rawStart, rawEnd] = event.time.split("-").map((s) => s.trim());
    const start = parseClockToMinutes(rawStart);
    const end = rawEnd ? parseClockToMinutes(rawEnd) : null;
    if (start === null || end === null) return false;
    return nowMin >= start && nowMin < end;
  }

  return false;
}

/**
 * Whether an event's session has already ended. A past calendar day is
 * always past; for today it only counts once the session's end time (or,
 * for Panahan, start + duration) has gone by. Renang/Berkuda have no
 * reliable end time on the day itself, so they're never inferred past.
 */
export function isEventPast(event: EskulEvent, now: Date = new Date()): boolean {
  const today = isoToday();
  if (event.date < today) return true;
  if (event.date > today) return false;

  const nowMin = now.getHours() * 60 + now.getMinutes();

  if (event.eskul === "panahan") {
    const start = parseClockToMinutes(event.time);
    return start !== null && nowMin >= start + PANAHAN_DURATION_MIN;
  }

  if (event.eskul === "taekwondo" || event.eskul === "pramuka") {
    const rawEnd = event.time.split("-")[1]?.trim();
    const end = rawEnd ? parseClockToMinutes(rawEnd) : null;
    return end !== null && nowMin >= end;
  }

  return false;
}

function startMinutesOf(event: EskulEvent): number {
  const start = parseClockToMinutes(event.time.match(/^\d{1,2}[.,:]\d{2}/)?.[0] ?? "");
  return start ?? Infinity;
}

/** Groups already date-sorted events into consecutive same-day buckets, each sorted earliest-first. */
export function groupEventsByDate(
  events: EskulEvent[],
): { date: string; dateLabel: string; events: EskulEvent[] }[] {
  const groups: { date: string; dateLabel: string; events: EskulEvent[] }[] = [];
  for (const event of events) {
    const last = groups[groups.length - 1];
    if (last && last.date === event.date) {
      last.events.push(event);
    } else {
      groups.push({ date: event.date, dateLabel: event.dateLabel, events: [event] });
    }
  }
  for (const group of groups) {
    group.events.sort((a, b) => startMinutesOf(a) - startMinutesOf(b));
  }
  return groups;
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
