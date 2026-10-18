import type { Coach } from "./assessments";
import type { SessionData } from "./coach-sessions";
import type { Student } from "./students";
import type { EskulKey } from "./types";
export interface PortalProfile { id: string; username: string; role: "admin" | "coach" | "pendamping"; display_name: string; is_active: boolean }
export interface Assignment { user_id: string; extracurricular_id: EskulKey; class_id: string }
export interface PortalData {
  profile: PortalProfile;
  profiles: PortalProfile[];
  coaches: Coach[];
  assignments: Assignment[];
  extracurriculars: { id: EskulKey; name: string; is_active: boolean }[];
  students: Student[];
  classes: { id: string; level: "SMP" | "SMK" }[];
  sessions: SessionData;
}
export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };
