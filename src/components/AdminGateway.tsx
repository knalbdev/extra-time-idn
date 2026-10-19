"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { signInAction } from "@/app/coach/actions";
import { PortalLoginDialog } from "./PortalLoginDialog";
import { PortalFeedbackProvider, usePortalFeedback } from "./PortalFeedback";
import { Icon } from "./Icon";

export function AdminGateway({enabled,error}:{enabled:boolean;error?:string}) {
  return <PortalFeedbackProvider><Gateway enabled={enabled} error={error}/></PortalFeedbackProvider>;
}
function Gateway({enabled,error}:{enabled:boolean;error?:string}) {
  const {busy,run}=usePortalFeedback();
  const [open,setOpen]=useState(false),[username,setUsername]=useState(""),[password,setPassword]=useState(""),[message,setMessage]=useState("");
  function login(event:FormEvent) {
    event.preventDefault();if(busy)return;
    setMessage("");
    void run("Sedang memeriksa akun…",async()=>{
      const result=await signInAction({username,password,target:"admin"});
      if(!result.ok){setMessage(result.error);setPassword("");}
    });
  }
  return <main className="mx-auto min-h-screen max-w-5xl space-y-6 px-4 py-6 text-primary sm:px-8 sm:py-8">
    <Link href="/?view=dashboard" className="inline-flex rounded-xl border border-outline-variant bg-white px-4 py-3 text-xs font-semibold">← Kembali ke dashboard</Link>
    {(!enabled||error)&&<p role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900">{error??"Portal belum siap digunakan. Hubungi pengelola untuk mengaktifkan akses."}</p>}
    <section className="companion-hero"><div className="relative min-w-0"><p className="text-[10px] font-bold tracking-[.18em] text-cyan-100">IDN AKHWAT / ADMINISTRASI ESKUL</p><h1 className="mt-5 font-heading text-4xl font-bold tracking-tight sm:text-5xl">Portal Admin</h1><p className="mt-4 max-w-xl text-sm leading-relaxed text-blue-100 sm:text-base">Kelola akun coach, penilaian siswi, dan laporan pendamping melalui akun admin.</p><button type="button" disabled={!enabled} onClick={()=>{setOpen(true);setMessage("");}} className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-2xl bg-white px-6 py-3 text-sm font-bold text-primary hover:bg-cyan-50 disabled:opacity-50 sm:w-auto">Masuk sebagai admin<Icon name="arrow_forward" className="text-lg"/></button></div><div aria-hidden className="companion-hero-mark"><Icon name="admin_panel_settings"/></div></section>
    <p className="text-sm leading-relaxed text-on-surface-variant">Halaman ini khusus admin. Coach dan pendamping masuk melalui portal masing-masing.</p>
    {open&&<PortalLoginDialog variant="admin" coachName="Akun admin" username={username} onUsername={setUsername} password={password} onPassword={setPassword} busy={busy} error={message} onSubmit={login} onClose={()=>{if(!busy){setOpen(false);setPassword("");}}}/>}
  </main>;
}
