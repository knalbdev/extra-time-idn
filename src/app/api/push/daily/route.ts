import { pushClock, dailyPush, isPushEndpoint } from "@/lib/push";
import { pushConfig, pushErrorStatus, sendPush, validCronAuthorization } from "@/lib/push-server";
import { adminClient } from "@/lib/supabase/server";
import { getAllEvents } from "@/lib/sheets";
import { ESKUL_ORDER } from "@/lib/constants";

export const runtime = "nodejs";
export const maxDuration = 60;
type Job = { subscription_id: string; endpoint: string; p256dh: string; auth_key: string; lease: string };
const json = (body: object, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

// Configure an external scheduler with POST + Authorization, never a public URL
// containing a secret. Repeated 08:00–08:55 WIB invocations drain/retry the queue.
export async function POST(request: Request) {
  const config = pushConfig();
  if (!config) return json({ error: "Not configured" }, 503);
  if (!validCronAuthorization(request.headers.get("authorization"), config.cronSecret)) return json({ error: "Unauthorized" }, 401);
  const { day, inWindow } = pushClock();
  if (!inWindow) return json({ skipped: "Outside 08:00–08:59 WIB window" });
  const started = Date.now();
  try {
    const client = adminClient();
    const { data: ids, error } = await client.rpc("get_enabled_extracurriculars").abortSignal(AbortSignal.timeout(8000));
    if (error || !Array.isArray(ids)) throw new Error("Activities unavailable");
    const enabled = ESKUL_ORDER.filter(key => ids.includes(key));
    // No cached browser data; partial sheet failures abort before claiming work.
    const payload = dailyPush(await getAllEvents(enabled), enabled, day);
    if (!payload) return json({ day, sent: 0, skipped: "No activities" });
    let sent = 0, failed = 0, batches = 0;
    while (Date.now() - started < 38000) {
      const { data: jobs, error } = await client.rpc("claim_daily_push", { target_day: day }).abortSignal(AbortSignal.timeout(5000));
      if (error || !Array.isArray(jobs)) throw new Error("Queue unavailable");
      if (!jobs.length) return json({ day, sent, failed, batches });
      batches++;
      await Promise.all((jobs as Job[]).map(async job => {
        let status = 400;
        if (isPushEndpoint(job.endpoint)) {
          try {
            // Do not deliver a morning reminder after the day has passed.
            const ttl = Math.max(0, Math.floor((Date.parse(`${day}T23:59:59+07:00`) - Date.now()) / 1000));
            status = (await sendPush({ endpoint: job.endpoint, keys: { p256dh: job.p256dh, auth: job.auth_key } }, payload, ttl)).statusCode;
          } catch (error) { status = pushErrorStatus(error); }
        }
        const { error } = await client.rpc("finish_daily_push", { target_id: job.subscription_id, target_day: day, claim_lease: job.lease, response_status: status }).abortSignal(AbortSignal.timeout(5000));
        if (error) throw new Error("Delivery receipt unavailable");
        if (status >= 200 && status < 300) sent++; else failed++;
      }));
    }
    return json({ day, sent, failed, batches, continuation: "Next scheduler invocation resumes the queue" });
  } catch { return json({ error: "Schedule notifications could not be completed; retry within the morning window." }, 503); }
}
