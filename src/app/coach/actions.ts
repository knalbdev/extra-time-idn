"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { adminClient, sessionClient } from "@/lib/supabase/server";
import { currentAccount, loadPortal } from "@/lib/portal-data";
import { assignmentSchema, loginSchema, meetingSchema, recordSchema } from "@/lib/portal-validation";
import type { ActionResult, PortalData } from "@/lib/portal-types";
import { ESKUL_ORDER } from "@/lib/constants";
import { z } from "zod";

const denied = "Username atau password tidak sesuai, atau akun tidak memiliki akses ke portal ini.";
const failed = "Proses belum berhasil. Periksa koneksi dan coba lagi. Jika masih terkendala, hubungi admin.";
export async function signInAction(input: unknown): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: denied };
  try {
    const { username, password, target } = parsed.data;
    const service = adminClient();
    const h = await headers();
    // Vercel overwrites this header. On other hosts, use a shared limit rather than trusting an arbitrary X-Forwarded-For.
    const ip = process.env.VERCEL ? h.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ?? "shared" : "local-shared";
    const hash = (value: string) => createHash("sha256").update(value).digest("hex");
    const limit = await service.rpc("consume_portal_login", { account_hash: hash(username), client_hash: hash(ip) });
    if (limit.error) return { ok: false, error: "Login sementara belum tersedia. Silakan hubungi admin dan coba lagi nanti." };
    if (!limit.data) return { ok: false, error: "Terlalu banyak percobaan login. Coba lagi dalam 15 menit." };
    const lookup = await service.from("profiles").select("id,is_active").eq("username", username).maybeSingle();
    let email = "unknown-account@invalid.example";
    if (lookup.data?.is_active) {
      const authUser = await service.auth.admin.getUserById(lookup.data.id);
      if (authUser.data.user?.email) email = authUser.data.user.email;
    }
    const client = await sessionClient();
    const result = await client.auth.signInWithPassword({ email, password });
    if (result.error || !result.data.user || result.data.user.id !== lookup.data?.id || !lookup.data.is_active) {
      if (result.data.session) await client.auth.signOut({ scope: "local" });
      return { ok: false, error: denied };
    }
    const account = await currentAccount();
    let allowed = Boolean(account && account.profile.role === (target === "admin" ? "admin" : target === "pendamping" ? "pendamping" : "coach"));
    if (allowed && target !== "admin" && target !== "pendamping") {
      const scope = await client.from("assignments").select("class_id").eq("user_id", result.data.user.id).eq("extracurricular_id", target).limit(1);
      allowed = !scope.error && Boolean(scope.data?.length);
      const activity = await client.from("extracurriculars").select("is_active").eq("id", target).maybeSingle();
      if (allowed && !activity.error && activity.data?.is_active === false) {
        await client.auth.signOut({ scope: "local" });
        return { ok: false, error: "Ekstrakurikuler ini sedang dinonaktifkan. Silakan hubungi admin." };
      }
      allowed = allowed && !activity.error && activity.data?.is_active === true;
    }
    if (!allowed) { await client.auth.signOut({ scope: "local" }); return { ok: false, error: denied }; }
    revalidatePath("/");
    revalidatePath("/coach");
    revalidatePath("/admin");
    revalidatePath("/pendamping");
    return { ok: true, data: undefined };
  } catch { return { ok: false, error: failed }; }
}
export async function signOutAction(): Promise<ActionResult> {
  try {
    const client = await sessionClient();
    const { error } = await client.auth.signOut({ scope: "local" });
    if (error) return { ok: false, error: "Belum berhasil keluar dari akun. Silakan coba lagi." };
    revalidatePath("/");
    revalidatePath("/coach");
    revalidatePath("/admin");
    revalidatePath("/pendamping");
    return { ok: true, data: undefined };
  } catch { return { ok: false, error: failed }; }
}
export async function refreshPortalAction(): Promise<ActionResult<PortalData>> {
  try { const data = await loadPortal(); return data ? { ok: true, data } : { ok: false, error: "Sesi masuk sudah berakhir atau akun tidak aktif. Silakan masuk kembali; hubungi admin jika masih terkendala." }; }
  catch { return { ok: false, error: failed }; }
}
async function dataAfterWrite(): Promise<ActionResult<PortalData>> {
  try {
    const data = await loadPortal();
    return data ? { ok: true, data } : { ok: false, error: "Data berhasil disimpan. Silakan masuk kembali untuk melihat hasilnya." };
  } catch { return { ok: false, error: "Data berhasil disimpan, tetapi tampilannya belum diperbarui. Pilih Perbarui data untuk melihat hasilnya sebelum menyimpan ulang." }; }
}
export async function saveMeetingAction(input: unknown): Promise<ActionResult<PortalData>> {
  const parsed = meetingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Data pertemuan tidak valid. Periksa kelas, tanggal, semester, dan materi." };
  try {
    const account = await currentAccount();
    if (!account || account.profile.role !== "coach") return { ok: false, error: "Akses coach diperlukan." };
    const { client, profile } = account;
    const m = parsed.data;
    const existing = await client.from("meetings").select("id").eq("id", m.id).maybeSingle();
    if (existing.error) return { ok: false, error: failed };
    const payload = { id: m.id, coach_id: profile.id, extracurricular_id: m.eskul, class_id: m.className, title: m.title, meeting_date: m.date, period: m.period, skill: m.skill };
    const write = existing.data ? await client.from("meetings").update(payload).eq("id", m.id).select("id").single() : await client.from("meetings").insert(payload).select("id").single();
    if (write.error) return { ok: false, error: "Pertemuan gagal disimpan. Periksa penugasan; materi yang sudah memiliki nilai tidak dapat diubah." };
    return await dataAfterWrite();
  } catch { return { ok: false, error: failed }; }
}
export async function saveRecordAction(input: unknown): Promise<ActionResult<PortalData>> {
  const parsed = recordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Data absensi/nilai tidak valid. Predikat A–E hanya diisi saat hadir." };
  try {
    const account = await currentAccount();
    if (!account || account.profile.role !== "coach") return { ok: false, error: "Akses coach diperlukan." };
    const { client } = account;
    const r = parsed.data;
    const meeting = await client.from("meetings").select("class_id").eq("id", r.meetingId).single();
    if (meeting.error) return { ok: false, error: "Pertemuan tidak ditemukan atau di luar penugasan." };
    const write = await client.from("meeting_records").upsert({ meeting_id: r.meetingId, student_id: r.studentId, class_id: meeting.data.class_id, attendance: r.attendance, grade: r.grade, notes: r.notes }, { onConflict: "meeting_id,student_id" }).select("student_id").single();
    if (write.error) return { ok: false, error: "Nilai belum tersimpan. Periksa kelas siswi dan penugasan coach." };
    return await dataAfterWrite();
  } catch { return { ok: false, error: failed }; }
}
export async function updateCoachAction(input: unknown): Promise<ActionResult<PortalData>> {
  const parsed = assignmentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Data penugasan tidak valid. Pilih minimal satu ekskul dan kelas untuk akun coach yang benar." };
  try {
    const account = await currentAccount();
    if (!account || account.profile.role !== "admin") return { ok: false, error: "Akses admin diperlukan." };
    const p = parsed.data;
    const result = await account.client.rpc("update_coach_assignment", { target_id: p.userId, active: p.active, selected_eskuls: p.eskuls, selected_classes: p.classes });
    if (result.error) return { ok: false, error: "Penugasan belum berhasil disimpan. Perbarui data dan coba lagi. Jika masih terkendala, hubungi pengelola akun." };
    return await dataAfterWrite();
  } catch { return { ok: false, error: failed }; }
}

export async function updateExtracurricularAction(input: unknown): Promise<ActionResult<PortalData>> {
  const parsed = z.object({ id: z.enum(ESKUL_ORDER), active: z.boolean() }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Pilihan ekstrakurikuler tidak valid." };
  try {
    const account = await currentAccount();
    if (!account || account.profile.role !== "admin") return { ok: false, error: "Akses admin diperlukan." };
    const result = await account.client.from("extracurriculars").update({ is_active: parsed.data.active }).eq("id", parsed.data.id).select("id").single();
    if (result.error) return { ok: false, error: "Status ekstrakurikuler belum berhasil disimpan. Silakan coba kembali." };
    // Public pages and staff workspaces read the same shared setting.
    revalidatePath("/", "layout");
    return await dataAfterWrite();
  } catch { return { ok: false, error: failed }; }
}
