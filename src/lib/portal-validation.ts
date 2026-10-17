import { z } from "zod";
export const eskulSchema = z.enum(["renang", "panahan", "berkuda", "taekwondo", "pramuka"]);
export const classSchema = z.enum(["7A", "7B", "8A", "8B", "9A", "9B", "10 RPL", "10 DKV", "11 RPL", "11 DKV"]);
export const loginSchema = z.object({ username: z.string().trim().toLowerCase().regex(/^[a-z][a-z0-9._-]{2,63}$/), password: z.string().min(1).max(1024), target: z.union([z.literal("admin"), eskulSchema]) });
export const meetingSchema = z.object({ id: z.uuid(), eskul: eskulSchema, className: classSchema, title: z.string().trim().min(1).max(120), date: z.iso.date(), period: z.enum(["2026-2027-1", "2026-2027-2"]), skill: z.string().trim().min(1).max(160) });
export const recordSchema = z.object({ meetingId: z.uuid(), studentId: z.string().min(1).max(40), attendance: z.enum(["hadir", "izin", "sakit", "alpa"]), grade: z.enum(["A", "B", "C", "D", "E"]).nullable(), notes: z.string().trim().max(2000) }).refine(r => r.attendance === "hadir" ? r.grade !== null : r.grade === null, { message: "Predikat hanya diisi untuk siswi yang hadir." });
export const assignmentSchema = z.object({ userId: z.uuid(), active: z.boolean(), eskuls: z.array(eskulSchema).min(1).max(5), classes: z.array(classSchema).min(1).max(10) });
