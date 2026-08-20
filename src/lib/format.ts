import { CLASS_LIST, DAY_LABELS_ID, MONTH_LABELS_ID, SMK_CLASSES, SMP_CLASSES } from "./constants";

// All dates in the app are plain ISO "yyyy-mm-dd" strings interpreted as
// wall-clock calendar dates (no timezone math) since the schedule only ever
// deals in whole days.

export function parseIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function isoToday(): string {
  const now = new Date();
  return dateToIso(now);
}

export function dateToIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatLongIndo(iso: string): string {
  const d = parseIso(iso);
  return `${DAY_LABELS_ID[d.getDay()]}, ${d.getDate()} ${
    MONTH_LABELS_ID[d.getMonth()]
  } ${d.getFullYear()}`;
}

export function formatShortIndo(iso: string): string {
  const d = parseIso(iso);
  return `${d.getDate()} ${MONTH_LABELS_ID[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
}

export function dayBadge(iso: string): { dayShort: string; dayNum: number } {
  const d = parseIso(iso);
  return { dayShort: DAY_LABELS_ID[d.getDay()].slice(0, 3), dayNum: d.getDate() };
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7); // yyyy-mm
}

export function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return `${MONTH_LABELS_ID[m - 1]} ${y}`;
}

/** Monday..Sunday range (inclusive) containing the given ISO date. */
export function weekRangeOf(iso: string): { start: string; end: string } {
  const d = parseIso(iso);
  const dow = d.getDay(); // 0 = Sunday .. 6 = Saturday
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(d);
  monday.setDate(d.getDate() + mondayOffset);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: dateToIso(monday), end: dateToIso(sunday) };
}

export function addDaysIso(iso: string, days: number): string {
  const d = parseIso(iso);
  d.setDate(d.getDate() + days);
  return dateToIso(d);
}

/**
 * Collapses a fully-covered class list into a single readable label
 * (e.g. all 10 classes -> "Semua Jenjang") instead of ten separate chips.
 */
export function summarizeClasses(classes: string[]): string[] {
  if (classes.length === 0) return [];
  const set = new Set(classes);
  if (CLASS_LIST.length === set.size && CLASS_LIST.every((c) => set.has(c))) {
    return ["Semua Jenjang"];
  }
  if (SMP_CLASSES.length === set.size && SMP_CLASSES.every((c) => set.has(c))) {
    return ["SMP"];
  }
  if (SMK_CLASSES.length === set.size && SMK_CLASSES.every((c) => set.has(c))) {
    return ["SMK"];
  }
  return classes;
}

export function formatUpdatedAt(iso: string): string {
  const d = new Date(iso);
  const datePart = d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });
  const timePart = d.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  });
  return `${datePart}, ${timePart} WIB`;
}
