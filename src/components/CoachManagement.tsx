"use client";
import { FormEvent, useState, useTransition } from "react";
import { updateCoachAction } from "@/app/coach/actions";
import { coachLabel } from "@/lib/assessments";
import { ESKUL_META, ESKUL_ORDER } from "@/lib/constants";
import type { PortalData } from "@/lib/portal-types";
import type { EskulKey } from "@/lib/types";
import { action, field, subtle } from "./CoachSessionForms";

export function CoachManagement({ portal, onSaved }: { portal: PortalData; onSaved: (portal: PortalData) => void }) {
  const [id, setId] = useState<string | null>(null);
  const selected = portal.coaches.find(c => c.id === id);
  return <div className="grid items-start gap-5 lg:grid-cols-[1fr_380px]"><section className="card rounded-2xl p-5"><p className="eyebrow">AKUN & PENUGASAN</p><h2 className="mt-2 font-heading text-xl font-bold">Tim coach</h2><p className="mt-2 text-xs leading-relaxed text-on-surface-variant">Kelola status aktif dan kelas/ekskul untuk akun coach yang sudah dibuat di Supabase. Role ditentukan oleh profil server; akun coach tidak dapat mengubah role sendiri.</p><div className="mt-5 space-y-3">{portal.coaches.map(c => <div className="rounded-xl border border-outline-variant p-4" key={c.id}><div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-semibold">{coachLabel(c.eskuls)}</h3><p className="mt-1 text-xs text-on-surface-variant">{portal.profiles.find(p=>p.id===c.id)?.username} · {c.active ? "Aktif" : "Nonaktif"}</p><p className="mt-2 text-[11px] text-on-surface-variant">{portal.assignments.filter(a=>a.user_id===c.id).length} penugasan kelas/ekskul</p></div><button className={subtle} onClick={()=>setId(c.id)}>Ubah</button></div></div>)}</div></section>{selected ? <AssignmentForm key={selected.id} userId={selected.id} portal={portal} onSaved={onSaved} onCancel={()=>setId(null)} /> : <div className="card rounded-2xl p-6 text-sm text-on-surface-variant">Pilih coach untuk mengatur penugasannya. Akun baru dibuat melalui Authentication dan template profil Supabase; tidak ada registrasi publik.</div>}</div>;
}
function AssignmentForm({ userId, portal, onSaved, onCancel }: { userId: string; portal: PortalData; onSaved: (portal: PortalData)=>void; onCancel:()=>void }) {
  const existing=portal.assignments.filter(a=>a.user_id===userId);
  const [eskuls,setEskuls]=useState<EskulKey[]>([...new Set(existing.map(a=>a.extracurricular_id))]);
  const [classes,setClasses]=useState([...new Set(existing.map(a=>a.class_id))]);
  const [active,setActive]=useState(portal.coaches.find(c=>c.id===userId)?.active??false);
  const [message,setMessage]=useState("");
  const [busy,startTransition]=useTransition();
  function save(e:FormEvent){e.preventDefault();startTransition(async()=>{try{const result=await updateCoachAction({userId,active,eskuls,classes});if(result.ok){onSaved(result.data);setMessage("Penugasan dan status akun tersimpan di Supabase.");}else setMessage(result.error);}catch{setMessage("Koneksi terputus. Muat ulang data untuk memeriksa hasil penyimpanan.");}});}
  return <form onSubmit={save} className="card rounded-2xl p-5"><h2 className="font-heading text-lg font-bold">Ubah penugasan</h2><fieldset disabled={busy} className="mt-5 space-y-5"><fieldset><legend className="text-xs font-semibold">Ekskul</legend><div className="mt-3 flex flex-wrap gap-2">{ESKUL_ORDER.map(k=><label className="flex items-center gap-2 rounded-lg border border-outline-variant p-2 text-xs" key={k}><input type="checkbox" checked={eskuls.includes(k)} onChange={e=>setEskuls(e.target.checked?[...eskuls,k]:eskuls.filter(x=>x!==k))}/>{ESKUL_META[k].label}</label>)}</div></fieldset><fieldset><legend className="text-xs font-semibold">Kelas untuk seluruh ekskul yang dipilih</legend><div className="mt-3 grid grid-cols-2 gap-2">{portal.classes.map(c=><label className="flex items-center gap-2 text-xs" key={c.id}><input type="checkbox" checked={classes.includes(c.id)} onChange={e=>setClasses(e.target.checked?[...classes,c.id]:classes.filter(x=>x!==c.id))}/>{c.id}</label>)}</div></fieldset><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={active} onChange={e=>setActive(e.target.checked)}/>Akun aktif</label></fieldset><button className={`${action} mt-6 w-full`} disabled={busy||!eskuls.length||!classes.length}>{busy?"Menyimpan…":"Simpan penugasan"}</button><button type="button" className={`${field} text-center`} disabled={busy} onClick={onCancel}>Selesai</button><p role="status" className="mt-3 text-xs text-on-surface-variant">{message}</p></form>;
}
