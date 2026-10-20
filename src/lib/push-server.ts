import "server-only";
import { createECDH, createHash, createHmac, timingSafeEqual } from "node:crypto";
import webpush from "web-push";
import { hasSupabaseConfig } from "./supabase/server";

export function pushConfig() {
  const publicKey = process.env.WEB_PUSH_PUBLIC_KEY;
  const privateKey = process.env.WEB_PUSH_PRIVATE_KEY;
  const subject = process.env.WEB_PUSH_SUBJECT;
  const cronSecret = process.env.CRON_SECRET;
  if (!hasSupabaseConfig() || !publicKey || !privateKey || !subject || !cronSecret || cronSecret.length < 32) return null;
  try {
    const ecdh = createECDH("prime256v1");
    ecdh.setPrivateKey(Buffer.from(privateKey, "base64url"));
    if (ecdh.getPublicKey().toString("base64url") !== publicKey || !/^(mailto:[^\s@]+@[^\s@]+|https:\/\/[^\s]+)$/.test(subject)) return null;
    return { publicKey, privateKey, subject, cronSecret };
  } catch { return null; }
}

export function validCronAuthorization(value: string | null, secret: string) {
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(value ?? "");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function subscriptionHashes(token: string, address: string, secret: string) {
  return {
    owner: createHash("sha256").update(token).digest("hex"),
    client: createHmac("sha256", secret).update(address).digest("hex"),
  };
}

export async function sendPush(subscription: webpush.PushSubscription, payload: object, ttl = 3600) {
  const config = pushConfig();
  if (!config) throw new Error("Push unavailable");
  return webpush.sendNotification(subscription, JSON.stringify(payload), {
    vapidDetails: { subject: config.subject, publicKey: config.publicKey, privateKey: config.privateKey },
    TTL: ttl,
    urgency: "normal",
    timeout: 5000,
  });
}

export function pushErrorStatus(error: unknown) {
  return error && typeof error === "object" && "statusCode" in error && typeof error.statusCode === "number" ? error.statusCode : 503;
}
