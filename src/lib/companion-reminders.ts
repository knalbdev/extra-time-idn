import type { EskulEvent } from "./types";

export interface CompletionSnapshot {
  source_spreadsheet: string;
  extracurricular_id: string;
  activity_date: string;
  activity_time: string;
  class_ids: string[];
}
export interface CompanionReportingState {
  startsOn: string;
  checkedAt: string;
  completed: CompletionSnapshot[];
}
export interface CompanionOverview {
  serverTime: string;
  schedules: EskulEvent[];
  reporting: CompanionReportingState | null;
  reminderError?: string;
}

// Use the start clock in WIB; an end clock is not a substitute for a missing
// start. Labels such as "Ba'da Ashar" cannot safely define a one-hour deadline.
export function sessionStartMinutes(time: string): number | null {
  const match = time.trim().match(/^(?:pukul\s+)?(\d{1,2})[.:,](\d{2})(?!\d)/i);
  if (!match) return null;
  const hour = Number(match[1]), minute = Number(match[2]);
  return hour < 24 && minute < 60 ? hour * 60 + minute : null;
}
export function reminderDueAt(event: Pick<EskulEvent, "date" | "time">): number | null {
  const start = sessionStartMinutes(event.time);
  if (start === null) return null;
  const midnight = Date.parse(`${event.date}T00:00:00+07:00`);
  return Number.isFinite(midnight) ? midnight + (start + 60) * 60_000 : null;
}
export function sessionReportKey(eskul: string, date: string, time: string, classes: string[]): string {
  // Stable across row reordering, end-time estimates, punctuation and class order.
  // Date/start/class changes represent a different session and need a new report.
  return JSON.stringify([eskul, date, sessionStartMinutes(time) ?? time.trim().toLowerCase(), [...new Set(classes)].sort()]);
}
export const eventReportKey = (event: EskulEvent) => sessionReportKey(event.eskul,event.date,event.time,event.classes);
export function completionKeys(state: CompanionReportingState, spreadsheet: string): Set<string> {
  return new Set(state.completed.filter(row=>row.source_spreadsheet===spreadsheet)
    .map(row=>sessionReportKey(row.extracurricular_id,row.activity_date,row.activity_time,row.class_ids)));
}
export function pendingCompanionSessions(events: EskulEvent[], state: CompanionReportingState, spreadsheet: string, now: number): EskulEvent[] {
  const done = completionKeys(state,spreadsheet), seen = new Set<string>();
  return events.filter(event=>{
    const key = eventReportKey(event), due = reminderDueAt(event);
    if (event.date < state.startsOn || ["libur","ditiadakan"].includes(event.statusNormalized) || !event.classes.length || due === null || now < due || done.has(key) || seen.has(key)) return false;
    seen.add(key); return true;
  }).sort((a,b)=>reminderDueAt(a)!-reminderDueAt(b)! || a.eskulLabel.localeCompare(b.eskulLabel));
}
export function unclockedCompanionSessions(events: EskulEvent[], state: CompanionReportingState, spreadsheet: string, today: string): EskulEvent[] {
  const done=completionKeys(state,spreadsheet);
  return events.filter(event=>event.date>=state.startsOn && event.date<=today && event.classes.length
    && !["libur","ditiadakan"].includes(event.statusNormalized) && reminderDueAt(event)===null && !done.has(eventReportKey(event)));
}
