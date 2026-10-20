import type { NextRequest } from "next/server";
import { pushRequestSchema } from "@/lib/push";
import { pushConfig, pushErrorStatus, sendPush, subscriptionHashes } from "@/lib/push-server";
import { adminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
const json = (body: object, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

async function smallBody(request: Request) {
  if (!request.headers.get("content-type")?.startsWith("application/json") || Number(request.headers.get("content-length") ?? 0) > 4096) throw new Error("Invalid body");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Missing body");
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 4096) throw new Error("Body too large");
      chunks.push(value);
    }
  } finally { await reader.cancel(); }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return json({ error: "Permintaan tidak dapat diproses." }, 403);
  const config = pushConfig();
  if (!config) return json({ error: "Pengingat jadwal belum tersedia. Silakan coba lagi nanti." }, 503);
  let body;
  try { body = pushRequestSchema.parse(await smallBody(request)); }
  catch { return json({ error: "Pengaturan notifikasi tidak valid. Silakan coba kembali." }, 400); }
  try {
    const hashes = subscriptionHashes(body.token, request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local", config.cronSecret);
    const client = adminClient();
    const { data, error } = await client.rpc("manage_push_subscription", {
      operation: body.action, push_endpoint: body.endpoint, owner_hash: hashes.owner, client_hash: hashes.client,
      public_key: body.action === "subscribe" ? body.keys.p256dh : null,
      auth_secret: body.action === "subscribe" ? body.keys.auth : null,
    }).abortSignal(AbortSignal.timeout(10000));
    if (error || !data) throw new Error("Subscription unavailable");
    if (data.limited) return json({ error: "Terlalu banyak percobaan. Coba kembali beberapa saat lagi." }, 429);
    if (body.action === "test") {
      if (!data.subscription) return json({ error: "Aktifkan pengingat terlebih dahulu, atau tunggu satu menit sebelum mencoba lagi." }, 429);
      try {
        await sendPush(data.subscription, { title: "Pengingat jadwal sudah aktif", body: "Pada hari kegiatan, jadwal ekstrakurikuler akan dikirim mulai pukul 08.00 WIB.", tag: "uji-jadwal", url: "/?view=dashboard" }, 60);
      } catch (error) {
        if ([404, 410].includes(pushErrorStatus(error))) {
          await client.rpc("manage_push_subscription", { operation: "unsubscribe", push_endpoint: body.endpoint, owner_hash: hashes.owner, client_hash: hashes.client });
        }
        return json({ error: "Notifikasi uji belum dapat dikirim. Periksa izin notifikasi atau aktifkan ulang pengingat." }, 502);
      }
      return json({ sent: true });
    }
    if (body.action === "subscribe" && !data.enabled) return json({ error: "Pengingat perlu diaktifkan ulang pada perangkat ini." }, 409);
    return json({ enabled: Boolean(data.enabled) });
  } catch { return json({ error: "Pengaturan notifikasi belum dapat disimpan. Silakan coba lagi." }, 503); }
}
