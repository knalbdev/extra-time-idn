"use client";

import { useEffect, useState } from "react";
import { refreshPortalAction, signOutAction } from "@/app/coach/actions";
import type { PortalData } from "@/lib/portal-types";
import { AdminCoachReporting } from "./AdminCoachReporting";
import { AdminCompanionReports } from "./AdminCompanionReports";
import { AdminExtracurricularSettings } from "./AdminExtracurricularSettings";
import { AdminSessionRecap } from "./AdminSessionRecap";
import { CoachManagement } from "./CoachManagement";
import { subtle } from "./CoachSessionForms";
import { useExtracurriculars } from "./ExtracurricularProvider";
import { Icon } from "./Icon";
import { PageHeading } from "./PageHeading";
import { PortalFeedbackProvider, usePortalFeedback } from "./PortalFeedback";

type Section="coach"|"companions"|null;
const tabs=[{key:"management",label:"Akun coach"},{key:"activities",label:"Pengaturan ekskul"},{key:"reporting",label:"Laporan penilaian"},{key:"sessions",label:"Rekap sesi"}] as const;
type Tab=typeof tabs[number]["key"];
export function AdminPortal({initial}:{initial:PortalData}) {
  return <PortalFeedbackProvider><Workspace initial={initial}/></PortalFeedbackProvider>;
}
function Workspace({initial}:{initial:PortalData}) {
  const {busy,run,notify,ask}=usePortalFeedback();
  const {refreshEnabled}=useExtracurriculars();
  const [portal,setPortal]=useState(initial),[section,setSection]=useState<Section>(null),[tab,setTab]=useState<Tab>("management"),[dirty,setDirty]=useState(false),[revision,setRevision]=useState(0);
  useEffect(()=>{
    if(!dirty)return;
    const handle=(event:BeforeUnloadEvent)=>event.preventDefault();window.addEventListener("beforeunload",handle);
    return()=>window.removeEventListener("beforeunload",handle);
  },[dirty]);
  async function navigate(change:()=>void) {
    if(busy)return;
    if(dirty&&!await ask({title:"Tinggalkan perubahan?",description:"Perubahan yang belum disimpan akan hilang jika kamu pindah halaman.",confirmLabel:"Ya, lanjutkan"}))return;
    setDirty(false);change();
  }
  async function logout() {
    if(!await ask({title:"Keluar dari akun?",description:dirty?"Ada perubahan yang belum disimpan. Jika keluar sekarang, perubahan tersebut akan hilang.":"Kamu bisa masuk kembali dengan akun admin yang sama.",confirmLabel:"Ya, keluar"}))return;
    void run("Sedang keluar dari akun…",async()=>{const result=await signOutAction();if(!result.ok)notify(result.error,"error");else setDirty(false);});
  }
  async function refresh() {
    if(busy)return;
    if(dirty&&!await ask({title:"Perbarui data?",description:"Koreksi yang belum disimpan akan diganti dengan data terbaru.",confirmLabel:"Ya, perbarui"}))return;
    void run("Sedang memperbarui data…",async()=>{
      await refreshEnabled();const result=await refreshPortalAction();
      if(!result.ok){notify(result.error,"error");return;}
      setPortal(result.data);setRevision(value=>value+1);setDirty(false);notify("Data sudah diperbarui.");
    });
  }
  const title=section==="companions"?"Manajemen laporan pendamping":tab==="activities"?"Pengaturan ekstrakurikuler":tab==="reporting"?"Laporan penilaian siswi":tab==="sessions"?"Rekap sesi terlaksana":"Manajemen coach";
  return <div className="min-h-screen bg-surface text-primary">
    <header className="print-hide sticky top-0 z-30 border-b border-outline-variant bg-white/95 backdrop-blur-xl"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-8"><div className="font-heading text-sm font-bold">IDN Akhwat<span className="mt-1 block text-[10px] font-medium tracking-widest text-on-surface-variant">PORTAL ADMIN</span></div><div className="flex flex-wrap gap-2"><button disabled={busy} className={subtle} onClick={refresh}>Perbarui data</button><button disabled={busy} className={subtle} onClick={logout}>Keluar akun</button></div></div></header>
    <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8">
      {section===null?<>
        <section className="companion-hero"><div><p className="text-[10px] font-bold tracking-[.18em] text-cyan-100">ADMINISTRASI EKSTRAKURIKULER</p><h1 className="mt-4 font-heading text-3xl font-bold tracking-tight sm:text-4xl">Portal Admin</h1><p className="mt-3 text-sm leading-relaxed text-blue-100">Pilih bagian yang ingin dikelola.</p></div><div aria-hidden className="companion-hero-mark"><Icon name="admin_panel_settings"/></div></section>
        <div aria-label="Pilihan pengelolaan admin" role="group" className="grid gap-5 md:grid-cols-2">{[
          {key:"coach" as const,title:"Manajemen coach",description:"Atur akun dan kelas coach, pengaturan eskul, laporan penilaian, serta rekap sesi kegiatan.",icon:"sports",color:"bg-blue-50 text-secondary",cta:"Kelola coach"},
          {key:"companions" as const,title:"Manajemen laporan pendamping",description:"Periksa catatan pelaksanaan dan dokumentasi yang dikirim pendamping. Koreksi laporan bila diperlukan.",icon:"photo_library",color:"bg-emerald-50 text-emerald-700",cta:"Kelola laporan pendamping"},
        ].map(item=><button key={item.key} type="button" aria-label={item.title} disabled={busy} onClick={()=>void navigate(()=>{setSection(item.key);setTab("management");})} className="card group flex min-w-0 flex-col items-start rounded-3xl p-6 text-left transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl disabled:opacity-50 sm:p-8"><span className={`flex h-14 w-14 items-center justify-center rounded-2xl ${item.color}`}><Icon name={item.icon} className="text-2xl"/></span><h2 className="mt-6 font-heading text-2xl font-bold leading-tight">{item.title}</h2><p className="mt-3 max-w-lg text-sm leading-relaxed text-on-surface-variant">{item.description}</p><span className="mt-6 flex w-full items-center justify-between gap-3 border-t border-outline-variant pt-4 text-sm font-semibold text-secondary">{item.cta}<Icon name="arrow_forward" className="text-xl"/></span></button>)}</div>
      </>:<>
        <div className="print-hide"><button type="button" disabled={busy} onClick={()=>void navigate(()=>setSection(null))} className={subtle}>← Menu admin</button></div>
        <div className="print-hide"><PageHeading eyebrow={section==="coach"?"PENGELOLAAN COACH":"LAPORAN KEGIATAN"} title={title} description={section==="coach"?"Kelola akun, penugasan, penilaian, dan pelaksanaan kegiatan.":"Periksa laporan pendamping beserta catatan dan tautan dokumentasinya."} icon={section==="coach"?"manage_accounts":"photo_library"}/></div>
        {section==="coach"?<>
          <nav aria-label="Menu manajemen coach" className="print-hide flex flex-wrap gap-2 border-b border-outline-variant pb-3">{tabs.map(item=><button key={item.key} type="button" disabled={busy} aria-current={tab===item.key?"page":undefined} onClick={()=>{if(tab!==item.key)void navigate(()=>setTab(item.key));}} className={`rounded-xl px-4 py-3 text-xs font-semibold ${tab===item.key?"bg-primary text-white":"bg-white text-on-surface-variant hover:bg-blue-50"}`}>{item.label}</button>)}</nav>
          {tab==="management"?<CoachManagement portal={portal} onSaved={setPortal}/>:tab==="activities"?<AdminExtracurricularSettings onSaved={setPortal}/>:tab==="reporting"?<AdminCoachReporting coaches={portal.coaches} data={portal.sessions} students={portal.students}/>:<AdminSessionRecap/>}
        </>:<AdminCompanionReports key={revision} onDirty={setDirty}/>}
      </>}
    </main>
  </div>;
}
