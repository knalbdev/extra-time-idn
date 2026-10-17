import { ESKUL_META } from "./constants";
import { EskulKey } from "./types";
import { Level } from "./students";

export const GRADES = ["A", "B", "C", "D", "E"] as const;
export type Grade = typeof GRADES[number];
export const GRADE_LABELS: Record<Grade, string> = { A: "Sangat baik", B: "Baik", C: "Cukup", D: "Perlu bimbingan", E: "Perlu pendampingan intensif" };
export interface Assessment { grade: Grade; notes: string; updatedAt: string; coachId: string }
export interface Coach { id: string; name: string; eskuls: EskulKey[]; levels: Level[]; active: boolean }
export interface CoachData { coaches: Coach[]; assessments: Record<string, Assessment> }
export const COACH_STORAGE_KEY = "extratime:coach-preview:v1";
export const DEFAULT_COACH_DATA: CoachData = { coaches: [{ id: "preview-coach", name: "Coach Pratinjau", eskuls: ["renang"], levels: ["SMP", "SMK"], active: true }], assessments: {} };
export function assessmentKey(studentId: string, eskul: EskulKey, period: string) { return `${studentId}|${eskul}|${period}`; }
export function parseCoachData(raw: string | null): CoachData {
  if (!raw) return structuredClone(DEFAULT_COACH_DATA);
  const data = JSON.parse(raw) as CoachData;
  if (!Array.isArray(data.coaches) || !data.assessments || typeof data.assessments !== "object" || Array.isArray(data.assessments)) throw new Error("Data pratinjau tidak valid.");
  const eskuls = ["renang", "panahan", "berkuda", "taekwondo", "pramuka"];
  if (!data.coaches.every(c => typeof c.id === "string" && typeof c.name === "string" && typeof c.active === "boolean" && Array.isArray(c.eskuls) && c.eskuls.every(e => eskuls.includes(e)) && Array.isArray(c.levels) && c.levels.every(l => ["SMP", "SMK"].includes(l)))) throw new Error("Data coach tidak valid.");
  if (!Object.values(data.assessments).every(a => GRADES.includes(a.grade) && typeof a.notes === "string" && typeof a.updatedAt === "string" && typeof a.coachId === "string")) throw new Error("Data nilai tidak valid.");
  return data;
}

export function coachLabel(eskuls: EskulKey[]): string { return `Coach ${eskuls.map(key => ESKUL_META[key].label).join(" / ") || "Belum ditugaskan"}`; }
