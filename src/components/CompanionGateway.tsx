"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, type FormEvent } from "react";
import { signInAction } from "@/app/coach/actions";
import { PortalLoginDialog } from "./PortalLoginDialog";
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
  return <main className="companion-gateway mx-auto min-h-screen max-w-6xl space-y-6 px-4 py-5 text-primary sm:space-y-8 sm:px-8 sm:py-8">
    <Link href="/?view=dashboard" className="inline-flex rounded-xl border border-outline-variant bg-white px-4 py-3 text-xs font-semibold">← Kembali ke dashboard</Link>
    {(!enabled||error)&&<p role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{error??"Portal belum siap digunakan. Silakan hubungi admin untuk mengaktifkan akses."}</p>}
    <section className="companion-hero companion-gateway-hero">
      <div className="relative min-w-0"><Image src="/idn.png" alt="Logo IDN Akhwat" width={100} height={56} className="mb-7 h-14 w-24 rounded-xl bg-white p-2 object-contain"/><p className="text-[10px] font-bold tracking-[.18em] text-cyan-100">IDN AKHWAT / DOKUMENTASI KEGIATAN</p><h1 className="mt-4 max-w-xl font-heading text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl">Portal Pendamping Eskul</h1><p className="mt-5 max-w-lg text-sm leading-relaxed text-blue-100 sm:text-base">Isi laporan kegiatan yang didampingi, lalu sertakan catatan dan tautan dokumentasinya.</p><button disabled={!enabled} onClick={()=>{setOpen(true);setMessage("");}} className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-2xl bg-white px-6 py-3.5 text-sm font-bold text-primary shadow-lg transition hover:bg-cyan-50 disabled:opacity-50 sm:w-auto">Masuk sebagai pendamping<Icon name="arrow_forward" className="text-lg"/></button><p className="mt-3 text-xs leading-relaxed text-blue-100">Gunakan username dan password akun bersama dari admin.</p></div>
      <div className="relative rounded-3xl border border-white/20 bg-white/10 p-5 backdrop-blur-sm sm:p-6"><div className="flex items-center gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-300 text-amber-950"><Icon name="notifications_active" className="text-2xl"/></span><div><p className="text-sm font-bold">Laporan setiap kegiatan</p><p className="mt-1 text-xs text-blue-100">Pengingat membantu melengkapi laporan.</p></div></div><div className="mt-6 space-y-4">{[{icon:"calendar_month",title:"Sesi sesuai jadwal",text:"Tanggal, jam, dan kelas langsung tersedia."},{icon:"edit_note",title:"Catatan pelaksanaan",text:"Sampaikan kendala atau hal yang perlu ditindaklanjuti."},{icon:"photo_library",title:"Dokumentasi kegiatan",text:"Kirim tautan Drive untuk ditinjau admin."}].map(item=><div key={item.title} className="flex items-start gap-3 border-t border-white/15 pt-4"><Icon name={item.icon} className="mt-0.5 text-xl text-cyan-200"/><div><p className="text-sm font-semibold">{item.title}</p><p className="mt-1 text-xs leading-relaxed text-blue-100">{item.text}</p></div></div>)}</div></div>
    </section>
    <div className="grid gap-3 sm:grid-cols-3">{[{title:"Pilih nama",text:"Pilih pendamping yang bertugas, atau isi nama tambahan."},{title:"Lengkapi sesi",text:"Gunakan pengingat atau pilih kegiatan yang didampingi."},{title:"Kirim laporan",text:"Tambahkan catatan dan tautan dokumentasi Google Drive."}].map((item,index)=><section key={item.title} className="card flex items-start gap-4 rounded-2xl p-5"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xs font-bold text-secondary">0{index+1}</span><div><h2 className="font-heading text-base font-bold">{item.title}</h2><p className="mt-1.5 text-xs leading-relaxed text-on-surface-variant">{item.text}</p></div></section>)}</div>
    {open&&<PortalLoginDialog variant="pendamping" coachName="Akun pendamping bersama" username={username} onUsername={setUsername} password={password} onPassword={setPassword} busy={busy} error={message} onSubmit={login} onClose={()=>{if(!busy){setOpen(false);setPassword("");}}}/>}
  </main>;
}
