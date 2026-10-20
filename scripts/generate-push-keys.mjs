// Run locally once. Writes secrets directly to the ignored .env.local file.
import { readFile, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import webpush from "web-push";

const file = new URL("../.env.local", import.meta.url);
let current = "";
try { current = await readFile(file, "utf8"); } catch (error) { if (error.code !== "ENOENT") throw error; }
const existing = Object.fromEntries([...current.matchAll(/^(WEB_PUSH_PUBLIC_KEY|WEB_PUSH_PRIVATE_KEY|WEB_PUSH_SUBJECT|CRON_SECRET)=(.*)$/gm)].map(match => [match[1], match[2].trim().replace(/^['"]|['"]$/g, "")]));
const real = value => value && !/REPLACE|YOUR_ADMIN_EMAIL/.test(value);
if (real(existing.WEB_PUSH_PUBLIC_KEY) || real(existing.WEB_PUSH_PRIVATE_KEY)) {
  console.error("Pengaturan notifikasi sudah ada di .env.local. Tidak ada kunci yang diubah. Gunakan pasangan kunci yang sama untuk deployment berikutnya.");
  process.exitCode = 1;
} else {
  const keys = webpush.generateVAPIDKeys();
  const preserved = current.replace(/^(?:WEB_PUSH_PUBLIC_KEY|WEB_PUSH_PRIVATE_KEY|WEB_PUSH_SUBJECT|CRON_SECRET)=.*\r?\n?/gm, "").trimEnd();
  const subject = real(existing.WEB_PUSH_SUBJECT) ? existing.WEB_PUSH_SUBJECT : "mailto:YOUR_ADMIN_EMAIL";
  const secret = real(existing.CRON_SECRET) ? existing.CRON_SECRET : randomBytes(32).toString("hex");
  await writeFile(file, `${preserved}\n\n# Device notifications (keep these keys for future deployments)\nWEB_PUSH_PUBLIC_KEY=${keys.publicKey}\nWEB_PUSH_PRIVATE_KEY=${keys.privateKey}\nWEB_PUSH_SUBJECT=${subject}\nCRON_SECRET=${secret}\n`, { mode: 0o600 });
  console.log("Pengaturan notifikasi ditambahkan ke .env.local. Ganti YOUR_ADMIN_EMAIL pada WEB_PUSH_SUBJECT, lalu salin keempat variabel baru ke Vercel.");
}
