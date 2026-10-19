"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { signInAction } from "@/app/coach/actions";
import { CoachLoginDialog } from "./CoachLoginDialog";
import { PortalFeedbackProvider, usePortalFeedback } from "./PortalFeedback";
import { Icon } from "./Icon";

export function CompanionGateway({ enabled, error }: { enabled: boolean; error?: string }) {
  return <PortalFeedbackProvider><Gateway enabled={enabled} error={error} /></PortalFeedbackProvider>;
}
function Gateway({ enabled, error }: { enabled: boolean; error?: string }) {
  const { busy, run } = usePortalFeedback();
  const [open,setOpen] = useState(false);
  const [username,setUsername] = useState("pendamping.eskul");
  const [password,setPassword] = useState("");
  const [message,setMessage] = useState("");
  function login(event: FormEvent) {
    event.preventDefault();
    if(busy)return;
    void run("Sedang memeriksa akun…",async()=>{
      const result=await signInAction({username,password,target:"pendamping"});
      if(!result.ok){setMessage(result.error);setPassword("");}
    });
  }
  return <main className="mx-auto min-h-screen max-w-5xl space-y-7 px-4 py-7 text-primary sm:px-8">
    <Link href="/?view=dashboard" className="inline-flex rounded-xl border border-outline-variant bg-white px-4 py-3 text-xs font-semibold">← Kembali ke dashboard</Link>
    {(!enabled||error)&&<p role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{error??"Portal belum siap digunakan. Silakan hubungi admin untuk mengaktifkan akses."}</p>}
    <section className="dashboard-hero relative isolate overflow-hidden rounded-[2rem] p-7 text-white sm:p-10"><div aria-hidden className="hero-orbit"/><p className="text-[10px] font-semibold tracking-[.2em] text-blue-200">IDN AKHWAT / DOKUMENTASI KEGIATAN</p><h1 className="mt-5 font-heading text-3xl font-bold sm:text-4xl">Portal Pendamping Eskul</h1><p className="mt-4 max-w-xl text-sm leading-relaxed text-blue-100">Catat pendampingan dan kumpulkan dokumentasi kegiatan dalam satu tempat.</p><button disabled={!enabled} onClick={()=>{setOpen(true);setMessage("");}} className="mt-7 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-primary disabled:opacity-50">Masuk pendamping<Icon name="arrow_forward" className="text-lg"/></button></section>
    <div className="grid gap-4 sm:grid-cols-3">{[{title:"Pilih nama",text:"Gunakan akun bersama, lalu pilih nama pendamping yang bertugas."},{title:"Pilih sesi",text:"Tanggal, jam, kelas, dan eskul mengikuti jadwal kegiatan."},{title:"Kirim dokumentasi",text:"Tambahkan catatan bila ada kendala dan tautan dokumentasi Google Drive."}].map((item,index)=><section key={item.title} className="card rounded-2xl p-6"><p className="text-xs font-bold text-secondary">0{index+1}</p><h2 className="mt-4 font-heading text-lg font-bold">{item.title}</h2><p className="mt-2 text-xs leading-relaxed text-on-surface-variant">{item.text}</p></section>)}</div>
    {open&&<CoachLoginDialog companion coachName="Akun pendamping bersama" username={username} onUsername={setUsername} password={password} onPassword={setPassword} busy={busy} error={message} onSubmit={login} onClose={()=>{if(!busy){setOpen(false);setPassword("");}}}/>}
  </main>;
}
