import "server-only";
import { sessionClient } from "./supabase/server";
import { coachLabel } from "./assessments";
import { recordKey } from "./coach-sessions";
import type { Grade } from "./assessments";
import type { PortalData, PortalProfile, Assignment } from "./portal-types";
import type { EskulKey } from "./types";

export async function currentAccount() {
  const client = await sessionClient();
  // getUser checks the current Auth user with Supabase, not a client-supplied role.
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return null;
  const profile = await client.from("profiles").select("id,username,role,display_name,is_active").eq("id", user.id).maybeSingle();
  if (profile.error || !profile.data?.is_active) return null;
  return { client, profile: profile.data as PortalProfile };
}
export async function loadPortal(): Promise<PortalData | null> {
  const account = await currentAccount();
  if (!account) return null;
  const { client, profile } = account;
  if (profile.role === "pendamping") return { profile, profiles: [profile], coaches: [], assignments: [], extracurriculars: [], students: [], classes: [], sessions: { meetings: [], records: {} } };
  const results = await Promise.all([
    client.from("profiles").select("id,username,role,display_name,is_active").order("username"),
    client.from("assignments").select("user_id,extracurricular_id,class_id"),
    client.from("students").select("id,name,class_id,is_active").order("id"),
    client.from("classes").select("id,level"),
    client.from("meetings").select("id,coach_id,extracurricular_id,class_id,title,meeting_date,period,skill,grade_descriptions").order("meeting_date").order("id"),
    client.from("extracurriculars").select("id,name,is_active"),
  ]);
  if (results.some(result => result.error)) throw new Error("Data portal belum dapat dimuat. Periksa tabel, RLS, dan penugasan Supabase.");
  const profiles = results[0].data! as PortalProfile[];
  const assignments = results[1].data! as Assignment[];
  const classes = results[3].data! as PortalData["classes"];
  const classLevel = new Map(classes.map(c => [c.id, c.level]));
  // Paginate records: Supabase's default 1000-row cap must not truncate reports.
  const records: Record<string, import("./coach-sessions").MeetingRecord> = {};
  for (let offset = 0; ; offset += 1000) {
    const page = await client.from("meeting_records").select("meeting_id,student_id,attendance,grade,notes,updated_at").order("meeting_id").order("student_id").range(offset, offset + 999);
    if (page.error) throw new Error("Catatan siswi belum dapat dimuat dari Supabase.");
    for (const row of page.data!) records[recordKey(row.meeting_id, row.student_id)] = { attendance: row.attendance, grades: row.grade ? { skill: row.grade as Grade } : {}, notes: row.notes, updatedAt: row.updated_at };
    if (page.data!.length < 1000) break;
  }
  // Meetings can also grow beyond a single page.
  const meetings = [...results[4].data!];
  if (meetings.length === 1000) {
    for (let offset = 1000; ; offset += 1000) {
      const page = await client.from("meetings").select("id,coach_id,extracurricular_id,class_id,title,meeting_date,period,skill,grade_descriptions").order("meeting_date").order("id").range(offset, offset + 999);
      if (page.error) throw new Error("Pertemuan belum dapat dimuat.");
      meetings.push(...page.data!);
      if (page.data!.length < 1000) break;
    }
  }
  return {
    profile, profiles, assignments, classes, extracurriculars: results[5].data! as PortalData["extracurriculars"],
    students: results[2].data!.map(s => ({ id: s.id, name: s.name, className: s.class_id, level: classLevel.get(s.class_id)! })),
    coaches: profiles.filter(p => p.role === "coach").map(p => {
      const scope = assignments.filter(a => a.user_id === p.id);
      const eskuls = [...new Set(scope.map(a => a.extracurricular_id))] as EskulKey[];
      return { id: p.id, name: coachLabel(eskuls), active: p.is_active, eskuls, levels: [...new Set(scope.map(a => classLevel.get(a.class_id)!).filter(Boolean))] };
    }),
    sessions: { meetings: meetings.map(m => ({ id: m.id, coachId: m.coach_id, eskul: m.extracurricular_id, className: m.class_id, title: m.title, date: m.meeting_date, period: m.period, skill: m.skill, objective: "", rubric: [{ id: "skill", title: m.skill, descriptors: m.grade_descriptions }] })), records },
  };
}
