"use client";

import Image from "next/image";
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
import { action, field } from "./CoachSessionForms";
import { useExtracurriculars } from "./ExtracurricularProvider";
import { CompanionReminders } from "./CompanionReminders";
import { Icon } from "./Icon";
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
        } else setReminderError("Jadwal dan status laporan belum dapat diperbarui. Pilih Perbarui jadwal untuk mencoba kembali.");
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
  const today=isoToday(new Date(now));
  const todayCount=active.filter(event=>event.date===today).length;
  return <div className="companion-workspace min-h-screen text-primary">
    <header className="sticky top-0 z-30 border-b border-outline-variant/70 bg-white/95 backdrop-blur-xl"><div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-8"><div className="flex min-w-0 items-center gap-2.5"><Image src="/idn.png" alt="Logo IDN" width={48} height={40} className="h-10 w-12 shrink-0 rounded-lg bg-white object-contain p-1"/><div className="min-w-0 font-heading text-sm font-bold">IDN Akhwat<span className="mt-0.5 block text-[9px] font-medium tracking-[.14em] text-on-surface-variant">PENDAMPING ESKUL</span></div></div><div className="flex shrink-0 gap-2"><button disabled={busy} type="button" aria-label="Perbarui jadwal" onClick={refresh} className="companion-header-button"><Icon name="refresh" className="text-xl"/><span className="hidden sm:inline">Perbarui jadwal</span></button><button disabled={busy} type="button" onClick={logout} className="companion-header-button"><Icon name="logout" className="text-lg"/><span>Keluar akun</span></button></div></div></header>
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-5 sm:space-y-8 sm:px-8 sm:py-8">
      <section className="companion-hero">
        <div className="relative min-w-0"><div className="flex flex-wrap items-center gap-3"><p className="text-[10px] font-bold tracking-[.18em] text-cyan-100">PENDAMPINGAN KEGIATAN</p><span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-1.5 text-[10px] font-medium text-white"><span aria-hidden className={`h-1.5 w-1.5 rounded-full ${overview.reporting&&!reminderError?"bg-emerald-300":"bg-amber-300"}`}/>{overview.reporting&&!reminderError?"Jadwal terhubung":"Periksa pembaruan"}</span></div><h1 className="mt-5 max-w-2xl font-heading text-3xl font-bold leading-[1.12] tracking-tight sm:text-4xl lg:text-5xl">Laporan Pendamping Eskul</h1><p className="mt-4 max-w-xl text-sm leading-relaxed text-blue-100 sm:text-base">Pilih sesi yang didampingi, isi catatan bila ada kendala, lalu kirim tautan dokumentasinya.</p>
        <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 border-t border-white/15 pt-5 text-xs text-blue-100"><span className="inline-flex items-center gap-2"><Icon name="calendar_today" className="text-base text-cyan-200"/>{formatLongIndo(today)}</span><span className="inline-flex items-center gap-2"><Icon name="event_available" className="text-base text-cyan-200"/>{todayCount} sesi hari ini</span></div></div>
        <div aria-hidden className="companion-hero-mark"><Icon name="edit_note" className="text-7xl"/></div>
      </section>
      {error&&<p role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{error}</p>}
      <CompanionReminders pending={pending} unclocked={unclocked} startsOn={overview.reporting?.startsOn} today={today} error={reminderError} busy={busy} onSelect={event=>void fillReminder(event)}/>
      {receipt?<section aria-label="Laporan berhasil dikirim" className="companion-receipt card rounded-3xl p-6 sm:p-9"><span aria-hidden className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-2xl text-emerald-700">✓</span><h2 className="mt-5 font-heading text-2xl font-bold">Laporan berhasil dikirim.</h2><p className="mt-3 text-sm leading-relaxed text-on-surface-variant">{receipt.name} · {receipt.eskul} · {formatLongIndo(receipt.date)}</p><p className="mt-2 text-xs text-on-surface-variant">Admin dapat meninjau catatan dan dokumentasi yang kamu kirim.</p><button className={`${action} mt-6`} onClick={()=>setReceipt(null)}>Kirim laporan lain</button></section>:
      <form id="companion-report-form" onSubmit={submit} className="companion-form card scroll-mt-28 overflow-hidden rounded-3xl">
        <div className="flex items-start gap-3 border-b border-outline-variant/70 bg-slate-50/70 p-5 sm:px-8 sm:py-6"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-secondary"><Icon name="edit_document" className="text-2xl"/></span><div><p className="text-[10px] font-bold tracking-[.14em] text-on-surface-variant">FORMULIR PELAKSANAAN</p><h2 className="mt-1 font-heading text-xl font-bold">Lengkapi laporan kegiatan</h2><p className="mt-1 text-xs leading-relaxed text-on-surface-variant">Periksa nama, sesi, dan dokumentasi sebelum mengirim.</p></div></div>
        <fieldset disabled={busy} className="space-y-7 p-5 sm:space-y-8 sm:p-8">
          <div><p className="companion-step"><span>01</span>Identitas pendamping</p><div className="mt-3"><CompanionNameField value={name} onChange={value=>{setName(value);setDirty(true);}}/></div><p className="mt-2 text-xs text-on-surface-variant">Pilih nama pendamping yang bertugas pada sesi ini.</p></div>
          <div className="border-t border-outline-variant pt-6"><p className="companion-step"><span>02</span>Sesi pendampingan</p><div className="mt-3 grid gap-4 sm:grid-cols-2"><label className="text-xs font-semibold">Bulan kegiatan<select value={month} onChange={e=>{setMonth(e.target.value);setSessionId("");}} className={field}><option value="all">Semua bulan</option>{months.map(value=><option key={value} value={value}>{monthLabel(value)}</option>)}</select></label><label className="text-xs font-semibold">Ekstrakurikuler<select value={eskul} onChange={e=>{setEskul(e.target.value as typeof eskul);setSessionId("");}} className={field}><option value="all">Semua eskul aktif</option>{enabledEskuls.map(key=><option key={key} value={key}>{ESKUL_META[key].label}</option>)}</select></label></div><label className="mt-4 block text-xs font-semibold">Sesi yang didampingi<select required value={selected?sessionId:""} onChange={e=>{setSessionId(e.target.value);setDirty(true);}} className={field}><option value="">Pilih sesi kegiatan</option>{visible.map(event=><option key={event.id} value={event.id}>{formatShortIndo(event.date)} · {event.eskulLabel} · {event.time} · {event.classes.join(", ")}</option>)}</select></label>{!visible.length&&<p className="mt-3 text-xs text-on-surface-variant">Belum ada sesi yang dapat dipilih. Ubah filter atau muat ulang jadwal.</p>}
          {selected&&<div aria-label="Sesi terpilih" role="region" className="mt-5 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-cyan-50/60 p-5"><p className="font-semibold">{selected.eskulLabel}</p><p className="mt-2 text-xs leading-relaxed text-on-surface-variant">{formatLongIndo(selected.date)} · {selected.time}</p><div className="mt-3 flex flex-wrap gap-1.5">{selected.classes.map(item=><ClassChip key={item} label={item}/>)}</div></div>}</div>
          <div className="border-t border-outline-variant pt-6"><p className="companion-step"><span>03</span>Catatan & dokumentasi</p><label className="mt-4 flex items-center gap-3 rounded-2xl border border-outline-variant bg-slate-50 p-4 text-sm leading-relaxed"><input type="checkbox" checked={hasIssue} onChange={e=>{setHasIssue(e.target.checked);setDirty(true);}} className="h-4 w-4 accent-blue-600"/>Ada kendala atau catatan pelaksanaan</label>{hasIssue?<label className="mt-4 block text-xs font-semibold">Kendala atau catatan<textarea required maxLength={2000} rows={4} value={notes} onChange={e=>{setNotes(e.target.value);setDirty(true);}} className={field} placeholder="Ceritakan secara singkat hal yang perlu diketahui admin."/><span className="mt-1 block text-right text-[10px] font-normal text-on-surface-variant">{notes.length}/2000 karakter</span></label>:<p className="mt-2 text-xs text-on-surface-variant">Laporan akan ditandai tidak ada kendala.</p>}
          <label className="mt-5 block text-xs font-semibold">Link Google Drive dokumentasi<input required type="url" maxLength={2048} value={driveUrl} onChange={e=>{setDriveUrl(e.target.value);setDirty(true);}} className={field} placeholder="https://drive.google.com/drive/folders/…"/></label><p className={`mt-2 text-xs ${driveUrl&&!validLink?"text-rose-700":"text-on-surface-variant"}`}>{driveUrl&&!validLink?"Gunakan tautan file atau folder Google Drive yang valid.":"Pastikan tautan dokumentasi dapat diakses oleh admin."}</p></div>
          <div className="flex flex-col gap-4 border-t border-outline-variant pt-6 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-on-surface-variant">Periksa nama dan sesi sebelum mengirim laporan.</p><button type="submit" disabled={!selected||!validName||!validLink||(hasIssue&&!notes.trim())} className={`${action} min-h-12 w-full shadow-lg shadow-blue-600/15 sm:w-auto`}>Kirim laporan pendampingan<Icon name="arrow_forward" className="text-lg"/></button></div>
        </fieldset>
      </form>}
    </main>
  </div>;
}
