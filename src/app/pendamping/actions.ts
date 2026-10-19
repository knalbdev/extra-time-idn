"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { currentAccount } from "@/lib/portal-data";
import { adminClient } from "@/lib/supabase/server";
import { companionOverview, companionSchedules } from "@/lib/companion-data";
import { companionCorrectionSchema, companionSubmissionSchema, type CompanionReceipt, type CompanionReport } from "@/lib/companions";
import { ESKUL_META, SPREADSHEET_ID } from "@/lib/constants";
import type { ActionResult } from "@/lib/portal-types";
import type { CompanionOverview } from "@/lib/companion-reminders";

const unavailable = "Proses belum berhasil. Periksa koneksi dan coba kembali. Jika masih terkendala, hubungi admin.";
const columns = "id,submitted_by,companion_name,schedule_id,source_spreadsheet,extracurricular_id,activity_date,activity_time,class_ids,notes,drive_url,created_at,updated_at,updated_by";

export async function refreshCompanionSchedulesAction(): Promise<ActionResult<CompanionOverview>> {
  try {
    const account = await currentAccount();
    if (account?.profile.role !== "pendamping") return { ok:false, error:"Silakan masuk menggunakan akun pendamping." };
    return { ok:true, data:await companionOverview() };
  } catch { return { ok:false, error:"Jadwal belum dapat dimuat. Periksa koneksi, lalu coba muat ulang jadwal." }; }
}

export async function submitCompanionReportAction(input: unknown): Promise<ActionResult<CompanionReceipt>> {
  const parsed = companionSubmissionSchema.safeParse(input);
  if (!parsed.success) return { ok:false, error:"Periksa nama pendamping, sesi, catatan, dan tautan Google Drive yang diisi." };
  try {
    const account = await currentAccount();
    if (account?.profile.role !== "pendamping") return { ok:false, error:"Sesi masuk telah berakhir. Silakan masuk kembali menggunakan akun pendamping." };
    const form = parsed.data;
    // Accept an identical retry even if the sheet changed after the first save.
    const service = adminClient();
    const existing = await service.from("companion_reports").select(columns).eq("id",form.id).maybeSingle();
    if (existing.error) return { ok:false, error:"Laporan belum dapat dikirim. Hubungi admin untuk memeriksa kesiapan portal." };
    if (existing.data) {
      const row = existing.data as CompanionReport;
      if (row.submitted_by !== account.profile.id || row.companion_name !== form.name || row.schedule_id !== form.sessionId || row.notes !== form.notes || row.drive_url !== form.driveUrl)
        return { ok:false, error:"Isian pengiriman ini sudah berubah. Muat ulang formulir sebelum mengirim kembali." };
      return { ok:true, data:{id:row.id,name:row.companion_name,eskul:ESKUL_META[row.extracurricular_id].label,date:row.activity_date} };
    }
    const session = (await companionSchedules()).find(event=>event.id===form.sessionId);
    if (!session) return { ok:false, error:"Sesi tersebut sudah berubah atau tidak tersedia. Muat ulang jadwal, lalu pilih kembali sesi yang didampingi." };
    const result = await service.rpc("submit_companion_report", {
      actor_id:account.profile.id, report_id:form.id, selected_name:form.name,
      selected_session:session.id, session_source:SPREADSHEET_ID, session_eskul:session.eskul,
      session_date:session.date, session_time:session.time, session_classes:session.classes,
      report_notes:form.notes, report_drive_url:form.driveUrl,
    });
    if (result.error) return { ok:false, error:"Laporan belum dapat dipastikan terkirim. Coba kirim kembali dengan isian yang sama atau hubungi admin." };
    revalidatePath("/coach");
    return { ok:true, data:{id:form.id,name:form.name,eskul:session.eskulLabel,date:session.date} };
  } catch { return { ok:false, error:"Koneksi terputus saat mengirim laporan. Coba kirim kembali dengan isian yang sama; laporan tidak akan digandakan." }; }
}

export async function loadCompanionReportsAction(): Promise<ActionResult<CompanionReport[]>> {
  try {
    const account = await currentAccount();
    if (account?.profile.role !== "admin") return { ok:false, error:"Akses admin diperlukan." };
    const rows: CompanionReport[] = [];
    for (let offset=0; ;offset+=1000) {
      const page = await account.client.from("companion_reports").select(columns).order("created_at",{ascending:false}).order("id",{ascending:false}).range(offset,offset+999);
      if (page.error) return { ok:false, error:"Laporan pendamping belum dapat dimuat. Coba kembali atau hubungi pengelola untuk memeriksa kesiapan portal." };
      rows.push(...page.data as CompanionReport[]);
      if (page.data.length < 1000) break;
    }
    return { ok:true, data:rows };
  } catch { return { ok:false, error:unavailable }; }
}

export async function correctCompanionReportAction(input: unknown): Promise<ActionResult<CompanionReport>> {
  const parsed = companionCorrectionSchema.safeParse(input);
  if (!parsed.success) return { ok:false, error:"Periksa nama, catatan, dan tautan Google Drive yang diisi." };
  try {
    const account = await currentAccount();
    if (account?.profile.role !== "admin") return { ok:false, error:"Akses admin diperlukan." };
    const form = parsed.data;
    const result = await account.client.from("companion_reports").update({companion_name:form.name,notes:form.notes,drive_url:form.driveUrl}).eq("id",form.id).select(columns).single();
    if (result.error) return { ok:false, error:"Koreksi belum tersimpan. Muat ulang laporan dan coba kembali." };
    return { ok:true, data:result.data as CompanionReport };
  } catch { return { ok:false, error:unavailable }; }
}

export async function deleteCompanionReportAction(input: unknown): Promise<ActionResult<string>> {
  const parsed = z.uuid().safeParse(input);
  if (!parsed.success) return { ok:false, error:"Laporan tidak valid." };
  try {
    const account = await currentAccount();
    if (account?.profile.role !== "admin") return { ok:false, error:"Akses admin diperlukan." };
    const result = await account.client.from("companion_reports").delete().eq("id",parsed.data).select("id").single();
    if (result.error) return { ok:false, error:"Laporan belum dapat dihapus. Muat ulang laporan dan coba kembali." };
    return { ok:true, data:parsed.data };
  } catch { return { ok:false, error:unavailable }; }
}
