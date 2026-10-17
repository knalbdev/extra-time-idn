import { Grade, GRADES } from "./assessments";
import type { Student } from "./students";
import { CLASS_LIST } from "./constants";
import { EskulKey } from "./types";

export const SESSION_STORAGE_KEY = "extratime:coach-sessions:v1";
export const ATTENDANCE = { hadir: "Hadir", izin: "Izin", sakit: "Sakit", alpa: "Alpa" } as const;
export type Attendance = keyof typeof ATTENDANCE;
export interface Criterion { id: string; title: string; descriptors: Record<Grade, string> }
export interface Meeting {
  id: string; coachId: string; eskul: EskulKey; title: string; date: string;
  period: string; className: string; skill: string; objective: string; rubric: Criterion[];
}
export interface MeetingRecord { attendance: Attendance; grades: Record<string, Grade>; notes: string; updatedAt: string }
export interface SessionData { meetings: Meeting[]; records: Record<string, MeetingRecord> }
export const EMPTY_SESSIONS: SessionData = { meetings: [], records: {} };
export const PERIODS = [{ key: "2026-2027-1", label: "2026/2027 · Semester 1" }, { key: "2026-2027-2", label: "2026/2027 · Semester 2" }];
export function recordKey(meetingId: string, studentId: string) { return `${meetingId}|${studentId}`; }
export const GENERAL_DESCRIPTORS: Record<Grade, string> = {
  A: "Sangat baik: mampu melakukan materi atau skill secara mandiri, tepat, dan konsisten.",
  B: "Baik: mampu melakukan materi atau skill dengan baik dan sedikit arahan.",
  C: "Cukup: memahami dasar materi atau skill, tetapi masih membutuhkan latihan dan arahan.",
  D: "Perlu bimbingan: baru menguasai sebagian dasar materi atau skill dan membutuhkan bimbingan rutin.",
  E: "Perlu pendampingan intensif: belum menunjukkan penguasaan dasar dan membutuhkan latihan bertahap dengan pendampingan.",
};
export function defaultCriterion(title = ""): Criterion {
  return { id: crypto.randomUUID(), title, descriptors: { ...GENERAL_DESCRIPTORS } };
}
export function isComplete(meeting: Meeting, record?: MeetingRecord): boolean {
  return Boolean(record && (record.attendance !== "hadir" || meeting.rubric.every(c => GRADES.includes(record.grades[c.id]))));
}
export function parseSessions(raw: string | null, students: Student[]): SessionData {
  if (!raw) return structuredClone(EMPTY_SESSIONS);
  const data = JSON.parse(raw) as SessionData;
  const fail = () => { throw new Error("Data pertemuan lokal tidak valid; penyimpanan diblokir agar data tidak tertimpa."); };
  if (!data || !Array.isArray(data.meetings) || !data.records || typeof data.records !== "object" || Array.isArray(data.records)) return fail();
  const eskuls = ["renang", "panahan", "berkuda", "taekwondo", "pramuka"];
  for (const m of data.meetings) {
    if (!m || typeof m.id !== "string" || typeof m.coachId !== "string" || !eskuls.includes(m.eskul) || typeof m.title !== "string" || !m.title.trim() || typeof m.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(m.date) || !PERIODS.some(p => p.key === m.period) || !(CLASS_LIST as readonly string[]).includes(m.className) || typeof m.skill !== "string" || typeof m.objective !== "string" || !Array.isArray(m.rubric) || !m.rubric.length || m.rubric.length > 6) return fail();
    if (new Set(m.rubric.map(c => c.id)).size !== m.rubric.length) return fail();
    for (const c of m.rubric) {
      if (!c || typeof c.id !== "string" || typeof c.title !== "string" || !c.title.trim() || !c.descriptors) return fail();
      // Older A–D rubrics keep their original descriptions and recorded grades.
      if (c.descriptors.E === undefined && ["A", "B", "C", "D"].every(g => typeof c.descriptors[g as Grade] === "string" && c.descriptors[g as Grade].trim())) c.descriptors.E = GENERAL_DESCRIPTORS.E;
      if (!GRADES.every(g => typeof c.descriptors[g] === "string" && c.descriptors[g].trim())) return fail();
    }
  }
  if (new Set(data.meetings.map(m => m.id)).size !== data.meetings.length) return fail();
  for (const [key, r] of Object.entries(data.records)) {
    const [meetingId, studentId] = key.split("|");
    const m = data.meetings.find(m => m.id === meetingId);
    if (!m || !students.some(s => s.id === studentId && s.className === m.className) || !r || !(r.attendance in ATTENDANCE) || typeof r.notes !== "string" || r.notes.length > 2000 || typeof r.updatedAt !== "string" || !r.grades || typeof r.grades !== "object" || Array.isArray(r.grades)) return fail();
    if (!Object.entries(r.grades).every(([id, grade]) => m.rubric.some(c => c.id === id) && GRADES.includes(grade)) || !isComplete(m, r) || (r.attendance !== "hadir" && Object.keys(r.grades).length)) return fail();
  }
  return data;
}

// Do not average letter grades from different skills into an invented numeric score.
export function reportRows(meetings: Meeting[], records: SessionData["records"], students: Student[]) {
  return students.filter(s => meetings.some(m => m.className === s.className)).map(student => {
    const entries = meetings.filter(m => m.className === student.className).map(meeting => ({ meeting, record: records[recordKey(meeting.id, student.id)] }));
    const counts = { hadir: 0, izin: 0, sakit: 0, alpa: 0, unmarked: 0 };
    for (const e of entries) { if (e.record) counts[e.record.attendance]++; else counts.unmarked++; }
    return { student, entries, counts };
  });
}
export function csvCell(value: string | number): string {
  const text = String(value);
  const safe = /^[\s]*[=+@\-\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}
export function reportCsv(meetings: Meeting[], records: SessionData["records"], coachName: string, students: Student[]): string {
  const rows: (string | number)[][] = [["Ekskul", "Coach", "Nama", "Jenjang", "Kelas", "Tanggal", "Pertemuan", "Periode", "Teknik / skill", "Kehadiran", "Kriteria", "Predikat", "Deskripsi rubrik", "Catatan"]];
  for (const { student, entries } of reportRows(meetings, records, students)) for (const { meeting, record } of entries) for (const criterion of meeting.rubric) {
    const grade = record?.grades[criterion.id];
    rows.push([meeting.eskul, coachName || meeting.coachId, student.name, student.level, student.className, meeting.date, meeting.title, PERIODS.find(p => p.key === meeting.period)?.label ?? meeting.period, meeting.skill, record ? ATTENDANCE[record.attendance] : "Belum dicatat", criterion.title, grade ?? "—", grade ? criterion.descriptors[grade] : "—", record?.notes ?? ""]);
  }
  return "\uFEFF" + rows.map(row => row.map(csvCell).join(",")).join("\r\n");
}
