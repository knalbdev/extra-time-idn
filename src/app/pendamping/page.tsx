import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CompanionGateway } from "@/components/CompanionGateway";
import { CompanionPortal } from "@/components/CompanionPortal";
import { currentAccount } from "@/lib/portal-data";
import { hasSupabaseConfig } from "@/lib/supabase/server";
import { companionOverview } from "@/lib/companion-data";
import type { CompanionOverview } from "@/lib/companion-reminders";

export const metadata: Metadata = { title: "Portal Pendamping Eskul · IDN Akhwat", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function CompanionPage() {
  if (!hasSupabaseConfig()) return <CompanionGateway enabled={false} />;
  let account;
  try { account = await currentAccount(); }
  catch { return <CompanionGateway enabled error="Portal belum dapat dimuat. Coba muat ulang halaman atau hubungi admin." />; }
  if (!account) return <CompanionGateway enabled />;
  if (account.profile.role !== "pendamping") redirect(account.profile.role === "admin" ? "/admin" : "/coach");
  let overview:CompanionOverview = {serverTime:new Date().toISOString(),schedules:[],reporting:null}, error: string | undefined;
  try { overview = await companionOverview(); }
  catch { error = "Jadwal belum dapat dimuat. Periksa koneksi, lalu pilih Muat ulang jadwal untuk mencoba kembali."; }
  return <CompanionPortal key={account.profile.id} overview={overview} error={error} />;
}
