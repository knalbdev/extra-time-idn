import fs from "node:fs";
import path from "node:path";
import { redirect } from "next/navigation";
import { HomeClient } from "@/components/HomeClient";
import { currentAccount } from "@/lib/portal-data";
import { hasSupabaseConfig } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

function getDocumentationPhotos(): string[] {
  const dir = path.join(process.cwd(), "public", "images", "dokumentasi");
  try {
    return fs
      .readdirSync(dir)
      .filter((file) => IMAGE_EXTENSIONS.has(path.extname(file).toLowerCase()))
      .sort()
      .map((file) => `/images/dokumentasi/${file}`);
  } catch {
    return [];
  }
}

export default async function Home({ searchParams }: PageProps<"/">) {
  // Signed-in staff return to their workspace, including direct visits and Back.
  // The public schedule remains accessible when authentication is unavailable.
  let account = null;
  if (hasSupabaseConfig()) {
    try { account = await currentAccount(); } catch { /* Render the public page without a verified account. */ }
  }
  if (account?.profile.role === "admin") redirect("/admin");
  if (account?.profile.role === "coach") redirect("/coach");
  if (account?.profile.role === "pendamping") redirect("/pendamping");
  const documentationPhotos = getDocumentationPhotos();
  const query = await searchParams;
  const scheduleDate = typeof query.scheduleDate === "string" && /^20\d{2}-\d{2}-\d{2}$/.test(query.scheduleDate)
    && Number.isFinite(Date.parse(`${query.scheduleDate}T00:00:00Z`))
    && new Date(`${query.scheduleDate}T00:00:00Z`).toISOString().slice(0,10) === query.scheduleDate ? query.scheduleDate : undefined;
  return <HomeClient documentationPhotos={documentationPhotos} showDashboard={query.view === "dashboard"} scheduleDate={scheduleDate} />;
}
