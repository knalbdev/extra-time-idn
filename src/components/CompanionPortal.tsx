"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { refreshCompanionSchedulesAction, submitCompanionReportAction } from "@/app/pendamping/actions";
import { signOutAction } from "@/app/coach/actions";
import { companionNameSchema, isDocumentationLink, type CompanionReceipt } from "@/lib/companions";
import { ESKUL_META, SPREADSHEET_ID } from "@/lib/constants";
import { formatLongIndo, formatShortIndo, isoToday, monthLabel } from "@/lib/format";
import type { EskulEvent, EskulKey } from "@/lib/types";
import { ClassChip } from "./Badges";
import { CompanionNameField } from "./CompanionNameField";
import { pendingCompanionSessions, unclockedCompanionSessions, type CompanionOverview } from "@/lib/companion-reminders";
import { action, field, subtle } from "./CoachSessionForms";
import { useExtracurriculars } from "./ExtracurricularProvider";
import { PageHeading } from "./PageHeading";
import { PortalFeedbackProvider, usePortalFeedback } from "./PortalFeedback";

export function CompanionPortal({ overview, error }: { overview: CompanionOverview; error?: string }) {
  return <PortalFeedbackProvider><Workspace initial={overview} initialError={error}/></PortalFeedbackProvider>;
}
function Workspace({ initial, initialError }: { initial: CompanionOverview; initialError?: string }) {
  const { busy, run, notify, ask }=usePortalFeedback();
  const { enabledEskuls,refreshEnabled }=useExtracurriculars();
  const [overview,setOverview]=useState(initial);
  const [reminderError,setReminderError]=useState(initial.reminderError??"");
  const [now,setNow]=useState(()=>Date.parse(initial.serverTime));
  const clock=useRef<{server:number;anchor:number}|null>(null);
  const revision=useRef(0);
  const refreshing=useRef(false);
  const lastSync=useRef(0);
  const [error,setError]=useState(initialError??"");
  const [name,setName]=useState("");
  const [month,setMonth]=useState(()=>isoToday(new Date(initial.serverTime)).slice(0,7));
  const [eskul,setEskul]=useState<EskulKey|"all">("all");
  const [sessionId,setSessionId]=useState("");
  const [hasIssue,setHasIssue]=useState(false);
  const [notes,setNotes]=useState("");
  const [driveUrl,setDriveUrl]=useState("");
  const [dirty,setDirty]=useState(false);
  const [receipt,setReceipt]=useState<CompanionReceipt|null>(null);
  const request=useRef<{fingerprint:string;id:string}|null>(null);
  const active=overview.schedules.filter(event=>enabledEskuls.includes(event.eskul));
  const months=[...new Set([isoToday(new Date(now)).slice(0,7),...active.map(event=>event.date.slice(0,7))])].sort();
  const visible=active.filter(event=>(month==="all"||event.date.startsWith(month))&&(eskul==="all"||event.eskul===eskul));
  const selected=visible.find(event=>event.id===sessionId);
  const validLink=isDocumentationLink(driveUrl.trim());
  const validName=companionNameSchema.safeParse(name).success;
  const pending=overview.reporting?pendingCompanionSessions(active,overview.reporting,SPREADSHEET_ID,now):[];
  const unclocked=overview.reporting?unclockedCompanionSessions(active,overview.reporting,SPREADSHEET_ID,isoToday(new Date(now))):[];
  function applyOverview(value:CompanionOverview) {
    revision.current++;
    setOverview(value);setReminderError(value.reminderError??"");
    if(value.reporting){const server=Date.parse(value.reporting.checkedAt);clock.current={server,anchor:performance.now()};setNow(server);}
  }
  useEffect(()=>{
    const server=Date.parse(initial.serverTime);
    clock.current={server,anchor:performance.now()};
    const timer=window.setInterval(()=>{if(clock.current)setNow(clock.current.server+performance.now()-clock.current.anchor);},15000);
    return()=>window.clearInterval(timer);
  },[initial.serverTime]);
  useEffect(()=>{
    let alive=true;
    const poll=async()=>{
      if(document.visibilityState!=="visible"||busy||refreshing.current||performance.now()-lastSync.current<15000)return;
      refreshing.current=true;lastSync.current=performance.now();const token=revision.current;
      try {
        const result=await refreshCompanionSchedulesAction();
        if(!alive||token!==revision.current)return;
        if(result.ok){
          revision.current++;setOverview(result.data);setReminderError(result.data.reminderError??"");setError("");
          if(result.data.reporting){const server=Date.parse(result.data.reporting.checkedAt);clock.current={server,anchor:performance.now()};setNow(server);}
        } else setReminderError("Jadwal dan status laporan belum dapat diperbarui. Pilih Muat ulang jadwal untuk mencoba kembali.");
      } catch {if(alive&&token===revision.current)setReminderError("Pembaruan pengingat tertunda. Periksa koneksi, lalu muat ulang jadwal.");}
      finally {refreshing.current=false;}
    };
    const timer=window.setInterval(()=>void poll(),60000);
    const update=()=>void poll();
    window.addEventListener("focus",update);document.addEventListener("visibilitychange",update);
    return()=>{alive=false;window.clearInterval(timer);window.removeEventListener("focus",update);document.removeEventListener("visibilitychange",update);};
  },[busy]);
  async function fillReminder(event:EskulEvent) {
    if(busy)return;
    if(dirty&&sessionId!==event.id&&!await ask({title:"Ganti sesi laporan?",description:"Isian saat ini akan dikosongkan agar tidak terkirim ke sesi yang berbeda.",confirmLabel:"Ya, ganti sesi"}))return;
    if(sessionId!==event.id){setNotes("");setHasIssue(false);setDriveUrl("");request.current=null;}
    setReceipt(null);setMonth(event.date.slice(0,7));setEskul(event.eskul);setSessionId(event.id);setDirty(true);
    requestAnimationFrame(()=>document.getElementById("companion-report-form")?.scrollIntoView({behavior:"smooth",block:"start"}));
  }
  useEffect(()=>{
    if(!dirty)return;
    const handle=(event:BeforeUnloadEvent)=>event.preventDefault();
    window.addEventListener("beforeunload",handle);
    return()=>window.removeEventListener("beforeunload",handle);
  },[dirty]);
  function submit(event:FormEvent) {
    event.preventDefault();
    if(busy||!selected||!validName||!validLink||(hasIssue&&!notes.trim()))return;
    const payload={name,sessionId:selected.id,notes:hasIssue?notes.trim():"",driveUrl:driveUrl.trim()};
    const fingerprint=JSON.stringify(payload);
    if(request.current?.fingerprint!==fingerprint)request.current={fingerprint,id:crypto.randomUUID()};
    const id=request.current.id;
    void run("Sedang mengirim laporan pendampingan…",async()=>{
      const result=await submitCompanionReportAction({...payload,id});
      if(!result.ok){notify(result.error,"error");return;}
      revision.current++;
      setOverview(previous=>previous.reporting?{...previous,reporting:{...previous.reporting,completed:[...previous.reporting.completed,{source_spreadsheet:SPREADSHEET_ID,extracurricular_id:selected.eskul,activity_date:selected.date,activity_time:selected.time,class_ids:selected.classes}]}}:previous);
      setReceipt(result.data);setDirty(false);setName("");setSessionId("");setNotes("");setHasIssue(false);setDriveUrl("");request.current=null;
      notify("Laporan pendampingan berhasil dikirim dan dapat ditinjau admin.");
    });
  }
  async function logout() {
    if(!await ask({title:"Keluar dari akun?",description:dirty?"Ada isian laporan yang belum dikirim. Jika keluar sekarang, isian tersebut akan hilang.":"Kamu dapat masuk kembali menggunakan akun pendamping bersama.",confirmLabel:"Ya, keluar"}))return;
    void run("Sedang keluar dari akun…",async()=>{const result=await signOutAction();if(!result.ok)notify(result.error,"error");else setDirty(false);});
  }
  async function refresh() {
    if(dirty&&!await ask({title:"Perbarui jadwal?",description:"Pilihan sesi akan dikosongkan. Nama, catatan, dan tautan yang sudah diisi tetap dipertahankan.",confirmLabel:"Ya, perbarui"}))return;
    void run("Sedang memperbarui jadwal…",async()=>{
      await refreshEnabled();
      const result=await refreshCompanionSchedulesAction();
      if(!result.ok){setError(result.error);notify(result.error,"error");return;}
      applyOverview(result.data);setSessionId("");setError("");notify("Jadwal sudah diperbarui. Silakan pilih sesi yang didampingi.");
    });
  }
  return <div className="min-h-screen bg-surface text-primary">
    <header className="sticky top-0 z-30 border-b border-outline-variant bg-white/95 backdrop-blur-xl"><div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-8"><div className="font-heading text-sm font-bold">IDN Akhwat<span className="mt-1 block text-[10px] font-medium tracking-widest text-on-surface-variant">PORTAL PENDAMPING</span></div><div className="flex flex-wrap gap-2"><button disabled={busy} type="button" onClick={refresh} className={subtle}>Muat ulang jadwal</button><button disabled={busy} type="button" onClick={logout} className={subtle}>Keluar akun</button></div></div></header>
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-7 sm:px-8">
      <PageHeading eyebrow="PENDAMPINGAN KEGIATAN" title="Laporan Pendamping Eskul" description="Pilih nama dan sesi yang didampingi, lalu kirim catatan serta tautan dokumentasi kegiatan." icon="photo_library"/>
      {error&&<p role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{error}</p>}
      <section aria-label="Pengingat laporan pendamping" className={`rounded-3xl border p-5 sm:p-6 ${pending.length?"border-amber-300 bg-amber-50 shadow-sm":"border-outline-variant bg-white"}`}>
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="eyebrow text-amber-800">PENGINGAT LAPORAN</p><h2 className="mt-2 font-heading text-xl font-bold">{pending.length?`${pending.length} sesi belum memiliki laporan`:"Pantau laporan kegiatan"}</h2><p className="mt-2 text-xs leading-relaxed text-on-surface-variant">Laporan wajib diisi untuk setiap sesi. Pengingat muncul satu jam setelah kegiatan dimulai dan tetap ditampilkan sampai laporan masuk.</p></div>{pending.length>0&&<span className="rounded-full bg-amber-200 px-3 py-2 text-xs font-bold text-amber-950">Perlu dilengkapi</span>}</div>
        {reminderError&&<p role="alert" className="mt-4 rounded-xl border border-amber-300 bg-white p-3 text-xs leading-relaxed text-amber-950">{reminderError}</p>}
        {overview.reporting&&<><p className="mt-3 text-[11px] leading-relaxed text-on-surface-variant">Berlaku mulai {formatLongIndo(overview.reporting.startsOn)} · Diperbarui otomatis setiap menit saat halaman terbuka.</p>
          {pending.length?<div className="mt-4 grid gap-3 sm:grid-cols-2">{pending.map(event=><article key={event.id} className="min-w-0 rounded-2xl border border-amber-200 bg-white p-4"><p className="text-sm font-bold text-amber-950">Eskul {event.eskulLabel} belum ada laporan yang diisi.</p><p className="mt-2 text-xs leading-relaxed text-on-surface-variant">{formatLongIndo(event.date)} · {event.time} WIB</p><div className="mt-3 flex flex-wrap items-center gap-1.5"><span className="text-[11px] text-on-surface-variant">Kelas:</span>{event.classes.map(item=><ClassChip key={item} label={item}/>)}</div><button type="button" disabled={busy} onClick={()=>void fillReminder(event)} className={`${action} mt-4`}>Isi laporan sekarang</button></article>)}</div>:!reminderError&&<p className="mt-4 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-900">Tidak ada sesi yang perlu diingatkan saat ini. Laporan yang sudah masuk tidak ditampilkan lagi di sini.</p>}
          {unclocked.length>0&&<div className="mt-4 rounded-xl border border-amber-200 bg-white p-4"><p className="text-xs font-semibold text-amber-950">Jam mulai perlu dilengkapi di jadwal</p><p className="mt-2 text-xs leading-relaxed text-on-surface-variant">Pengingat satu jam belum dapat dihitung untuk sesi berikut. Laporan tetap dapat diisi.</p><ul className="mt-3 space-y-2">{unclocked.map(event=><li key={event.id} className="flex flex-wrap items-center justify-between gap-2 text-xs"><span>{event.eskulLabel} · {formatShortIndo(event.date)} · {event.classes.join(", ")} · {event.time}</span><button type="button" disabled={busy} onClick={()=>void fillReminder(event)} className={subtle}>Isi laporan sekarang</button></li>)}</ul></div>}
        </>}
      </section>
      {receipt?<section aria-label="Laporan berhasil dikirim" className="card rounded-3xl p-6 sm:p-8"><span aria-hidden className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-2xl text-emerald-700">✓</span><h2 className="mt-5 font-heading text-2xl font-bold">Terima kasih, laporan sudah diterima.</h2><p className="mt-3 text-sm leading-relaxed text-on-surface-variant">{receipt.name} · {receipt.eskul} · {formatLongIndo(receipt.date)}</p><p className="mt-2 text-xs text-on-surface-variant">Admin dapat meninjau catatan dan dokumentasi yang kamu kirim.</p><button className={`${action} mt-6`} onClick={()=>setReceipt(null)}>Kirim laporan lain</button></section>:
      <form id="companion-report-form" onSubmit={submit} className="card scroll-mt-40 rounded-3xl p-5 sm:p-8">
        <fieldset disabled={busy} className="space-y-6">
          <div><p className="eyebrow">01 · IDENTITAS PENDAMPING</p><div className="mt-3"><CompanionNameField value={name} onChange={value=>{setName(value);setDirty(true);}}/></div><p className="mt-2 text-xs text-on-surface-variant">Pilih nama pendamping yang bertugas pada sesi ini.</p></div>
          <div className="border-t border-outline-variant pt-6"><p className="eyebrow">02 · SESI PENDAMPINGAN</p><div className="mt-3 grid gap-4 sm:grid-cols-2"><label className="text-xs font-semibold">Bulan kegiatan<select value={month} onChange={e=>{setMonth(e.target.value);setSessionId("");}} className={field}><option value="all">Semua bulan</option>{months.map(value=><option key={value} value={value}>{monthLabel(value)}</option>)}</select></label><label className="text-xs font-semibold">Ekstrakurikuler<select value={eskul} onChange={e=>{setEskul(e.target.value as typeof eskul);setSessionId("");}} className={field}><option value="all">Semua eskul aktif</option>{enabledEskuls.map(key=><option key={key} value={key}>{ESKUL_META[key].label}</option>)}</select></label></div><label className="mt-4 block text-xs font-semibold">Sesi yang didampingi<select required value={selected?sessionId:""} onChange={e=>{setSessionId(e.target.value);setDirty(true);}} className={field}><option value="">Pilih sesi kegiatan</option>{visible.map(event=><option key={event.id} value={event.id}>{formatShortIndo(event.date)} · {event.eskulLabel} · {event.time} · {event.classes.join(", ")}</option>)}</select></label>{!visible.length&&<p className="mt-3 text-xs text-on-surface-variant">Belum ada sesi yang dapat dipilih. Ubah filter atau muat ulang jadwal.</p>}
          {selected&&<div aria-label="Sesi terpilih" role="region" className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/50 p-4"><p className="font-semibold">{selected.eskulLabel}</p><p className="mt-2 text-xs leading-relaxed text-on-surface-variant">{formatLongIndo(selected.date)} · {selected.time}</p><div className="mt-3 flex flex-wrap gap-1.5">{selected.classes.map(item=><ClassChip key={item} label={item}/>)}</div></div>}</div>
          <div className="border-t border-outline-variant pt-6"><p className="eyebrow">03 · CATATAN & DOKUMENTASI</p><label className="mt-4 flex items-center gap-3 text-sm"><input type="checkbox" checked={hasIssue} onChange={e=>{setHasIssue(e.target.checked);setDirty(true);}} className="h-4 w-4 accent-blue-600"/>Ada kendala atau catatan pelaksanaan</label>{hasIssue?<label className="mt-4 block text-xs font-semibold">Kendala atau catatan<textarea required maxLength={2000} rows={4} value={notes} onChange={e=>{setNotes(e.target.value);setDirty(true);}} className={field} placeholder="Ceritakan secara singkat hal yang perlu diketahui admin."/><span className="mt-1 block text-right text-[10px] font-normal text-on-surface-variant">{notes.length}/2000 karakter</span></label>:<p className="mt-2 text-xs text-on-surface-variant">Laporan akan ditandai tidak ada kendala.</p>}
          <label className="mt-5 block text-xs font-semibold">Link Google Drive dokumentasi<input required type="url" maxLength={2048} value={driveUrl} onChange={e=>{setDriveUrl(e.target.value);setDirty(true);}} className={field} placeholder="https://drive.google.com/drive/folders/…"/></label><p className={`mt-2 text-xs ${driveUrl&&!validLink?"text-rose-700":"text-on-surface-variant"}`}>{driveUrl&&!validLink?"Gunakan tautan file atau folder Google Drive yang valid.":"Pastikan tautan dokumentasi dapat diakses oleh admin."}</p></div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant pt-5"><p className="text-xs text-on-surface-variant">Periksa nama dan sesi sebelum mengirim laporan.</p><button type="submit" disabled={!selected||!validName||!validLink||(hasIssue&&!notes.trim())} className={action}>Kirim laporan pendampingan</button></div>
        </fieldset>
      </form>}
    </main>
  </div>;
}
