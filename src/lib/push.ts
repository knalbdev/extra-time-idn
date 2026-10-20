import { z } from "zod";
import { isoToday } from "./format";
import type { EskulEvent, EskulKey } from "./types";

// Only browser push services may be contacted. Never accept arbitrary HTTPS
// destinations: an anonymous subscription would otherwise become an SSRF proxy.
export function isPushEndpoint(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.port && !url.hash
      && url.pathname.length > 1 && (
        ["fcm.googleapis.com", "updates.push.services.mozilla.com", "web.push.apple.com"].includes(url.hostname)
        || /^[a-z0-9-]+\.notify\.windows\.com$/.test(url.hostname)
      );
  } catch { return false; }
}

const endpoint = z.string().max(2048).refine(isPushEndpoint);
const base = { endpoint, token: z.string().regex(/^[a-f0-9]{64}$/) };
export const pushRequestSchema = z.discriminatedUnion("action", [
  z.object({ ...base, action: z.literal("subscribe"), keys: z.object({
    p256dh: z.string().regex(/^B[A-Za-z0-9_-]{86}$/),
    auth: z.string().regex(/^[A-Za-z0-9_-]{22}$/),
  }) }),
  z.object({ ...base, action: z.enum(["status", "unsubscribe", "test"]) }),
]);

export function pushClock(now = new Date()) {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jakarta", hour: "2-digit", hourCycle: "h23" }).format(now));
  return { day: isoToday(now), inWindow: hour === 8 };
}

export function dailyPush(events: EskulEvent[], enabled: EskulKey[], day: string) {
  const sessions = events.filter(event => event.date === day && enabled.includes(event.eskul)
    && event.statusNormalized !== "libur" && event.statusNormalized !== "ditiadakan");
  const start = (time: string) => {
    const match = time.match(/(\d{1,2})[.:](\d{2})/);
    return match ? Number(match[1]) * 60 + Number(match[2]) : 1440;
  };
  sessions.sort((a, b) => start(a.time) - start(b.time) || a.eskul.localeCompare(b.eskul));
  const unique = [...new Map(sessions.map(event => [
    [event.eskul, event.time, [...event.classes].sort().join(",")].join("|"), event,
  ])).values()];
  if (!unique.length) return null;
  // Keep the encrypted payload comfortably below the 4KB Web Push limit.
  const lines = unique.slice(0, 4).map(event => `${event.eskulLabel} · ${event.time} WIB · ${event.classes.join(", ") || "Seluruh peserta"}`);
  if (unique.length > 4) lines.push(`+${unique.length - 4} sesi lainnya. Buka jadwal untuk melihat semuanya.`);
  return {
    title: `Jadwal ekstrakurikuler hari ini · ${unique.length} sesi`,
    body: lines.join("\n").slice(0, 1600),
    tag: `jadwal-${day}`,
    url: `/?view=dashboard&scheduleDate=${day}`,
  };
}
