import type { Metadata } from "next";
import { CoachGateway } from "@/components/CoachGateway";
import { CoachPortal } from "@/components/CoachPortal";
import { loadPortal } from "@/lib/portal-data";
import { hasSupabaseConfig } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Portal Coach · IDN Akhwat", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function CoachPage() {
  if (!hasSupabaseConfig()) return <CoachGateway enabled={false} />;
  let portal;
  let failed = false;
  try { portal = await loadPortal(); } catch { failed = true; }
  if (failed) return <CoachGateway enabled error="Data portal belum dapat dimuat. Periksa koneksi dan jalankan migration Supabase yang diperlukan." />;
  return portal ? <CoachPortal key={portal.profile.id} initial={portal} /> : <CoachGateway enabled />;
}
