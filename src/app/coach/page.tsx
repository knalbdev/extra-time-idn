import type { Metadata } from "next";
import { redirect } from "next/navigation";
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
  if (failed) return <CoachGateway enabled error="Data portal belum dapat dimuat. Coba muat ulang halaman. Jika masih terkendala, hubungi admin." />;
  if (portal?.profile.role === "pendamping") redirect("/pendamping");
  return portal ? <CoachPortal key={portal.profile.id} initial={portal} /> : <CoachGateway enabled />;
}
