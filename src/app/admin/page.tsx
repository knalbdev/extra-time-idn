import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminGateway } from "@/components/AdminGateway";
import { AdminPortal } from "@/components/AdminPortal";
import { currentAccount, loadPortal } from "@/lib/portal-data";
import { hasSupabaseConfig } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Portal Admin · IDN Akhwat", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function AdminPage() {
  if (!hasSupabaseConfig()) return <AdminGateway enabled={false}/>;
  let account;
  try { account=await currentAccount(); }
  catch { return <AdminGateway enabled error="Halaman admin belum bisa dibuka. Coba muat ulang halaman."/>; }
  if (!account) return <AdminGateway enabled/>;
  if (account.profile.role !== "admin") redirect(account.profile.role === "pendamping" ? "/pendamping" : "/coach");
  let portal;
  try { portal=await loadPortal(); }
  catch { return <AdminGateway enabled error="Data admin belum bisa dimuat. Coba muat ulang halaman."/>; }
  if(portal&&portal.profile.role!=="admin") redirect(portal.profile.role==="pendamping"?"/pendamping":"/coach");
  return portal ? <AdminPortal key={portal.profile.id} initial={portal}/> : <AdminGateway enabled/>;
}
