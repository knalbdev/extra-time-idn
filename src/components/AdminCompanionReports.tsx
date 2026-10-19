"use client";

import { useEffect, useState, type FormEvent } from "react";
import { correctCompanionReportAction, deleteCompanionReportAction, loadCompanionReportsAction } from "@/app/pendamping/actions";
import { COMPANION_NAMES, companionNameSchema, isDocumentationLink, type CompanionReport } from "@/lib/companions";
import { CLASS_LIST, ESKUL_META, ESKUL_ORDER } from "@/lib/constants";
import { formatLongIndo } from "@/lib/format";
import { recapUpdated } from "@/lib/session-recap";
import { ClassChip } from "./Badges";
import { CompanionNameField } from "./CompanionNameField";
import { action, field, subtle } from "./CoachSessionForms";
import { usePortalFeedback } from "./PortalFeedback";

export function AdminCompanionReports({ onDirty }: { onDirty:(dirty:boolean)=>void }) {
  const { busy,run,notify,ask }=usePortalFeedback();
  const [rows,setRows]=useState<CompanionReport[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [name,setName]=useState("all");
  const [eskul,setEskul]=useState("all");
  const [className,setClassName]=useState("all");
  const [editing,setEditing]=useState<string|null>(null);
  const [dirty,setDirty]=useState(false);
  useEffect(()=>{
    let active=true;
    void loadCompanionReportsAction().then(result=>{
      if(!active)return;
      if(result.ok)setRows(result.data);else setError(result.error);
    }).catch(()=>{if(active)setError("Laporan belum dapat dimuat. Coba muat ulang laporan.");}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[]);
  useEffect(()=>()=>onDirty(false),[onDirty]);
  const names=[...new Set([...COMPANION_NAMES,...rows.map(row=>row.companion_name)])].sort((a,b)=>a.localeCompare(b,"id"));
  const filtered=rows.filter(row=>(name==="all"||row.companion_name===name)&&(eskul==="all"||row.extracurricular_id===eskul)&&(className==="all"||row.class_ids.includes(className)));
  function refresh() {
    void run("Sedang memuat laporan pendamping…",async()=>{
      const result=await loadCompanionReportsAction();
      if(!result.ok){setError(result.error);notify(result.error,"error");return;}
      setRows(result.data);setError("");notify("Laporan pendamping sudah diperbarui.");
    });
  }
  async function cancelEdit() {
    if(dirty&&!await ask({title:"Batalkan koreksi?",description:"Perubahan yang belum disimpan akan hilang.",confirmLabel:"Ya, batalkan"}))return;
    setEditing(null);setDirty(false);onDirty(false);
  }
  async function remove(row:CompanionReport) {
    if(!await ask({title:"Hapus laporan pendamping?",description:`Laporan ${row.companion_name} untuk ${ESKUL_META[row.extracurricular_id].label} tanggal ${formatLongIndo(row.activity_date)} akan dihapus dari portal. File di Google Drive tetap tersimpan.`,confirmLabel:"Ya, hapus laporan"}))return;
    void run("Sedang menghapus laporan…",async()=>{
      const result=await deleteCompanionReportAction(row.id);
      if(!result.ok){notify(result.error,"error");return;}
      setRows(previous=>previous.filter(item=>item.id!==row.id));notify("Laporan pendamping berhasil dihapus.");
    });
  }
  function correct(row:CompanionReport,name:string,notes:string,driveUrl:string) {
    void run("Sedang menyimpan koreksi laporan…",async()=>{
      const result=await correctCompanionReportAction({id:row.id,name,notes,driveUrl});
      if(!result.ok){notify(result.error,"error");return;}
      setRows(previous=>previous.map(item=>item.id===row.id?result.data:item));setEditing(null);setDirty(false);onDirty(false);notify("Koreksi laporan berhasil disimpan.");
    });
  }
  return <div className="min-w-0 space-y-5">
    <section className="card rounded-2xl p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="eyebrow">DOKUMENTASI PELAKSANAAN</p><h2 className="mt-2 font-heading text-2xl font-bold">Laporan pendamping</h2><p className="mt-2 max-w-2xl text-xs leading-relaxed text-on-surface-variant">Tinjau catatan dan tautan dokumentasi yang dikirim melalui akun pendamping bersama.</p></div><button disabled={busy||loading||Boolean(editing)} onClick={refresh} className={subtle}>Muat ulang laporan</button></div>
      <fieldset disabled={busy||Boolean(editing)} className="mt-5 grid gap-4 sm:grid-cols-3"><label className="text-xs font-semibold">Filter pendamping<select value={name} onChange={e=>setName(e.target.value)} className={field}><option value="all">Semua pendamping</option>{names.map(item=><option key={item}>{item}</option>)}</select></label><label className="text-xs font-semibold">Filter eskul laporan<select value={eskul} onChange={e=>setEskul(e.target.value)} className={field}><option value="all">Semua eskul</option>{ESKUL_ORDER.map(key=><option key={key} value={key}>{ESKUL_META[key].label}</option>)}</select></label><label className="text-xs font-semibold">Filter kelas laporan<select value={className} onChange={e=>setClassName(e.target.value)} className={field}><option value="all">Semua kelas</option>{CLASS_LIST.map(item=><option key={item}>{item}</option>)}</select></label></fieldset>
    </section>
    {loading?<p role="status" className="card rounded-2xl p-6 text-sm text-on-surface-variant">Sedang memuat laporan pendamping…</p>:error?<p role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">{error}</p>:<>
      <p className="text-xs text-on-surface-variant">{filtered.length} dari {rows.length} laporan ditampilkan.</p>
      {!filtered.length&&<div className="card rounded-2xl border-dashed p-8 text-center text-sm text-on-surface-variant">Belum ada laporan sesuai filter yang dipilih.</div>}
      <div aria-label="Daftar laporan pendamping" role="region" className="grid gap-4 lg:grid-cols-2">{filtered.map(row=><article key={row.id} className="card min-w-0 rounded-2xl p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-widest text-secondary">{ESKUL_META[row.extracurricular_id].label}</p><h3 className="mt-2 font-heading text-lg font-bold">{row.companion_name}</h3></div><span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-semibold text-emerald-800">Laporan masuk</span></div>
        <p className="mt-3 text-xs leading-relaxed text-on-surface-variant">{formatLongIndo(row.activity_date)} · {row.activity_time}</p><div className="mt-3 flex flex-wrap gap-1.5">{row.class_ids.map(item=><ClassChip key={item} label={item}/>)}</div>
        {editing===row.id?<CorrectionForm key={row.id} row={row} disabled={busy} onDirty={()=>{setDirty(true);onDirty(true);}} onCancel={cancelEdit} onSave={(name,notes,url)=>correct(row,name,notes,url)}/>:<>
          <div className="mt-4 rounded-xl bg-surface p-4"><p className="text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant">Kendala atau catatan</p><p className="mt-2 whitespace-pre-wrap break-words text-xs leading-relaxed">{row.notes||"Tidak ada kendala."}</p></div>
          <a href={row.drive_url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex rounded-xl border border-blue-100 bg-blue-50 px-4 py-2.5 text-xs font-semibold text-secondary">Buka dokumentasi Drive ↗</a>
          <p className="mt-4 text-[10px] leading-relaxed text-on-surface-variant">Dikirim {recapUpdated(row.created_at)}{row.updated_by&&<span className="mt-1 block">Dikoreksi {recapUpdated(row.updated_at)}</span>}</p>
          <div className="mt-4 flex flex-wrap gap-2 border-t border-outline-variant pt-4"><button disabled={busy||Boolean(editing)} onClick={()=>setEditing(row.id)} className={subtle}>Koreksi laporan</button><button disabled={busy||Boolean(editing)} onClick={()=>remove(row)} className="rounded-xl border border-rose-200 px-4 py-2.5 text-xs font-semibold text-rose-700 disabled:opacity-50">Hapus laporan</button></div>
        </>}
      </article>)}</div>
    </>}
  </div>;
}

function CorrectionForm({ row,disabled,onDirty,onCancel,onSave }: {row:CompanionReport;disabled:boolean;onDirty:()=>void;onCancel:()=>void;onSave:(name:string,notes:string,url:string)=>void}) {
  const [name,setName]=useState(row.companion_name);
  const [notes,setNotes]=useState(row.notes);
  const [url,setUrl]=useState(row.drive_url);
  function submit(event:FormEvent){event.preventDefault();if(!disabled&&companionNameSchema.safeParse(name).success&&isDocumentationLink(url.trim()))onSave(name,notes,url);}
  return <form onSubmit={submit} className="mt-5 border-t border-outline-variant pt-4"><fieldset disabled={disabled} className="space-y-4"><CompanionNameField label="Koreksi nama pendamping" value={name} onChange={name=>{setName(name);onDirty();}}/><label className="block text-xs font-semibold">Koreksi catatan<textarea maxLength={2000} rows={4} value={notes} onChange={e=>{setNotes(e.target.value);onDirty();}} className={field} placeholder="Kosongkan jika tidak ada kendala."/></label><label className="block text-xs font-semibold">Koreksi link dokumentasi<input required type="url" maxLength={2048} value={url} onChange={e=>{setUrl(e.target.value);onDirty();}} className={field}/></label>{!isDocumentationLink(url.trim())&&<p className="text-xs text-rose-700">Gunakan tautan file atau folder Google Drive yang valid.</p>}<div className="flex flex-wrap gap-2"><button disabled={!companionNameSchema.safeParse(name).success||!isDocumentationLink(url.trim())} className={action}>Simpan koreksi</button><button type="button" onClick={onCancel} className={subtle}>Batal koreksi</button></div></fieldset></form>;
}
