import type { Student } from "./students";
import { Grade } from "./assessments";
import { GENERAL_DESCRIPTORS, Meeting, MeetingRecord, recordKey, reportRows, SessionData } from "./coach-sessions";

export const REPORT_DESCRIPTORS: Record<Grade, string> = {
  A: "Menguasai keterampilan secara mandiri, tepat, dan konsisten.",
  B: "Melaksanakan keterampilan dengan baik dan memerlukan sedikit arahan.",
  C: "Memahami dasar keterampilan, namun masih memerlukan latihan dan arahan.",
  D: "Menguasai sebagian dasar keterampilan dan memerlukan bimbingan rutin.",
  E: "Belum menguasai dasar keterampilan; memerlukan latihan bertahap dan pendampingan intensif.",
};
export type ReportSnapshot = { meetings: Meeting[]; records: SessionData["records"]; generatedAt: string };
export type SummaryRow = ReturnType<typeof reportRows>[number];
export type DetailRow = { student: Student; record?: MeetingRecord; notes: string; grade: string; description: string };
export type ReportSlide =
  | { kind: "cover" }
  | { kind: "overview" }
  | { kind: "summary"; className: string; rows: SummaryRow[] }
  | { kind: "meeting"; meeting: Meeting; rows: DetailRow[] }
  | { kind: "notes"; meeting: Meeting; student: Student; topic: string; reference: string; text: string; part: number; parts: number };

export function gradeDescription(meeting: Meeting, record?: MeetingRecord): string {
  if (!record) return "Penilaian belum dicatat.";
  if (record.attendance !== "hadir") return "Tidak dinilai karena tidak hadir.";
  return meeting.rubric.map(criterion => {
    const grade = record.grades[criterion.id];
    if (!grade) return "Predikat belum dicatat.";
    const saved = criterion.descriptors[grade];
    // Reword only the standard rubric; preserve the meaning of custom rubrics.
    const description = saved === GENERAL_DESCRIPTORS[grade] ? REPORT_DESCRIPTORS[grade] : saved;
    return meeting.rubric.length === 1 ? description : `${criterion.title}: ${description}`;
  }).join("\n");
}

// Split appendix text at word boundaries where possible, without dropping even
// whitespace. Frequent explicit line breaks also consume the slide's line budget.
export function splitReportNote(text: string): string[] {
  if (!text) return [""];
  const parts: string[] = [];
  let rest = text;
  while (rest.length) {
    let end = 0, column = 0, lines = 1;
    for (const char of Array.from(rest)) {
      if (end >= 900 || (lines >= 12 && (char === "\n" || column >= 100))) break;
      end += char.length;
      if (char === "\n" || column >= 100) { lines++; column = 0; } else column++;
    }
    if (end < rest.length) {
      const boundary = Math.max(rest.lastIndexOf(" ", end - 1), rest.lastIndexOf("\n", end - 1));
      if (boundary > end * .6) end = boundary + 1;
    }
    parts.push(rest.slice(0, end)); rest = rest.slice(end);
  }
  return parts;
}

export function buildReportSlides(meetings: Meeting[], records: SessionData["records"], students: Student[]): ReportSlide[] {
  const slides: ReportSlide[] = [{ kind: "cover" }, { kind: "overview" }];
  const rows = reportRows(meetings, records, students);
  for (const className of new Set(meetings.map(m => m.className))) {
    slides.push({ kind: "summary", className, rows: rows.filter(row => row.student.className === className) });
  }
  const appendices: ReportSlide[] = [];
  let referenceNumber = 0;
  for (const meeting of meetings) {
    const details = students.filter(s => s.className === meeting.className).map(student => {
      const record = records[recordKey(meeting.id, student.id)];
      const shorten = (text: string, limit: number, topic: string) => {
        const compact = text.replace(/\s+/g, " ").trim();
        if (compact.length <= limit && text.split("\n").length <= 2) return compact;
        const reference = `L${++referenceNumber}`;
        const segments = splitReportNote(text);
        segments.forEach((segment, index) => appendices.push({ kind: "notes", meeting, student, topic, reference, text: segment, part: index + 1, parts: segments.length }));
        const excerpt = compact.slice(0, limit - 15).replace(/\s+\S*$/, "");
        return `${excerpt}… (${reference})`;
      };
      return {
        student, record,
        grade: record?.attendance === "hadir" ? meeting.rubric.map(c => record.grades[c.id] ?? "—").join(" / ") : "—",
        description: shorten(gradeDescription(meeting, record), 135, "Keterangan predikat"),
        notes: shorten(record?.notes ?? "", 75, "Catatan coach"),
      };
    });
    slides.push({ kind: "meeting", meeting, rows: details });
  }
  return [...slides, ...appendices];
}
