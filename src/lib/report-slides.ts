import type { Student } from "./students";
import { Meeting, MeetingRecord, recordKey, reportRows, SessionData } from "./coach-sessions";

export type SummaryRow = ReturnType<typeof reportRows>[number];
export type DetailRow = { student: Student; record?: MeetingRecord; notes: string; continuation: boolean };
export type ReportSlide =
  | { kind: "cover" }
  | { kind: "overview" }
  | { kind: "summary"; className: string; rows: SummaryRow[] }
  | { kind: "meeting"; meeting: Meeting; rows: DetailRow[]; part: number };

// Keep every character of long notes, including line breaks. Extra note segments
// continue on subsequent rows/slides instead of clipping the coach's feedback.
export function splitReportNote(text: string): string[] {
  if (!text) return [""];
  const parts: string[] = [];
  let part = "", column = 0, lines = 1;
  for (const char of Array.from(text)) {
    if (part && (part.length >= 180 || (lines >= 4 && (char === "\n" || column >= 48)))) {
      parts.push(part); part = ""; column = 0; lines = 1;
    }
    part += char;
    if (char === "\n" || column >= 48) { lines++; column = 0; }
    else column++;
  }
  if (part) parts.push(part);
  return parts;
}

export function buildReportSlides(meetings: Meeting[], records: SessionData["records"], students: Student[]): ReportSlide[] {
  const slides: ReportSlide[] = [{ kind: "cover" }, { kind: "overview" }];
  const rows = reportRows(meetings, records, students);
  const classes = [...new Set(meetings.map(m => m.className))];
  for (const className of classes) {
    const group = rows.filter(row => row.student.className === className);
    for (let i = 0; i < group.length; i += 10) slides.push({ kind: "summary", className, rows: group.slice(i, i + 10) });
  }
  for (const meeting of meetings) {
    let page: DetailRow[] = [], used = 0, part = 1;
    for (const student of students.filter(s => s.className === meeting.className)) {
      const record = records[recordKey(meeting.id, student.id)];
      const segments = splitReportNote(record?.notes ?? "");
      for (let i = 0; i < segments.length; i++) {
        const notes = segments[i];
        const noteLines = notes.split("\n").reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / 48)), 0);
        const weight = Math.max(2, noteLines + 1, Math.ceil(student.name.length / 25) + 1);
        if (page.length && (used + weight > 16 || page.length >= 6)) {
          slides.push({ kind: "meeting", meeting, rows: page, part: part++ }); page = []; used = 0;
        }
        page.push({ student, record, notes, continuation: i > 0 }); used += weight;
      }
    }
    if (page.length) slides.push({ kind: "meeting", meeting, rows: page, part });
  }
  return slides;
}
