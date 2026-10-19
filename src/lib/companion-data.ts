import "server-only";
import { readEnabledExtracurriculars } from "./extracurricular-settings";
import { getAllEvents } from "./sheets";
import { reportableSessions } from "./companions";
import { sessionClient } from "./supabase/server";
import type { CompanionOverview } from "./companion-reminders";
import { z } from "zod";

export async function companionSchedules() {
  const enabled = await readEnabledExtracurriculars();
  return reportableSessions(await getAllEvents(enabled));
}

const reportingSchema = z.object({
  startsOn:z.iso.date(), checkedAt:z.iso.datetime({offset:true}),
  completed:z.array(z.object({source_spreadsheet:z.string(),extracurricular_id:z.string(),activity_date:z.iso.date(),activity_time:z.string(),class_ids:z.array(z.string())})),
});
export async function companionOverview(): Promise<CompanionOverview> {
  const [schedules,reporting]=await Promise.allSettled([
    companionSchedules(),
    (async()=>{const client=await sessionClient();const result=await client.rpc("get_companion_reporting_state").abortSignal(AbortSignal.timeout(10000));if(result.error)throw result.error;return reportingSchema.parse(result.data);})(),
  ]);
  if(schedules.status==="rejected")throw schedules.reason;
  return { serverTime:reporting.status==="fulfilled"?reporting.value.checkedAt:new Date().toISOString(), schedules:schedules.value, reporting:reporting.status==="fulfilled"?reporting.value:null,
    ...(reporting.status==="rejected"?{reminderError:"Pengingat laporan belum dapat diperbarui. Coba muat ulang jadwal atau hubungi admin. Formulir laporan tetap dapat digunakan."}:{}),
  };
}
