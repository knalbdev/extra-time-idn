"use client";
import Link from "next/link";
import { FormEvent, useState, useTransition } from "react";
import { signInAction } from "@/app/coach/actions";
import { ESKUL_META, ESKUL_ORDER } from "@/lib/constants";
import { EskulKey } from "@/lib/types";
import { CoachLoginDialog } from "./CoachLoginDialog";
import { EskulIcon } from "./EskulIcon";

export function CoachGateway({ enabled, error }: { enabled: boolean; error?: string }) {
  const [target, setTarget] = useState<EskulKey | "admin" | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, startTransition] = useTransition();
  function login(event: FormEvent) {
    event.preventDefault(); if (!target || busy) return;
    setMessage("");
    startTransition(async () => {
      try { const result = await signInAction({ username, password, target }); if (!result.ok) { setMessage(result.error); setPassword(""); } }
      catch { setMessage("Koneksi login terputus. Coba lagi."); }
    });
  }
  function open(value: EskulKey | "admin") { setTarget(value); setMessage(""); setUsername(""); setPassword(""); }
  return <main className="mx-auto min-h-screen max-w-7xl space-y-6 px-4 py-7 text-primary sm:px-8"><Link href="/" className="text-xs font-semibold text-secondary">← Kembali ke beranda</Link>
    {(!enabled || error) && <p role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900">{error ?? "Konfigurasi Supabase belum lengkap. Isi environment server sebelum login."}</p>}
    <section className="dashboard-hero relative isolate overflow-hidden rounded-[2rem] p-7 text-white sm:p-10"><div aria-hidden className="hero-orbit" /><p className="text-[10px] font-semibold tracking-[.2em] text-blue-200">IDN AKHWAT / COACH PORTAL</p><h1 className="mt-4 font-heading text-3xl font-bold leading-tight sm:text-4xl">Ruang melatih.<br />Tempat potensi bertumbuh.</h1><p className="mt-4 max-w-lg text-sm leading-relaxed text-blue-100">Pilih ruang coach dan masuk menggunakan akun yang disediakan admin.</p></section>
    <div><p className="eyebrow">RUANG EKSTRAKURIKULER</p><h2 className="mt-2 font-heading text-2xl font-bold">Pilih ruang coach</h2></div>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{ESKUL_ORDER.map(key => <button disabled={!enabled} key={key} onClick={() => open(key)} className="card group relative flex min-w-0 flex-col overflow-hidden rounded-3xl p-6 text-left transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl disabled:opacity-50"><span aria-hidden className={`absolute -right-6 -top-6 h-28 w-28 rounded-full opacity-40 ${ESKUL_META[key].iconBg}`} /><span className={`relative flex h-14 w-14 items-center justify-center rounded-2xl ${ESKUL_META[key].iconBg}`}><EskulIcon eskul={key} className={`h-7 w-7 ${ESKUL_META[key].iconColor}`} /></span><h3 className="mt-6 font-heading text-2xl font-bold">Coach {ESKUL_META[key].label}</h3><p className="mt-3 min-h-10 text-xs leading-relaxed text-on-surface-variant">{ESKUL_META[key].description}</p><span className="mt-6 w-full border-t border-outline-variant pt-4 text-xs font-semibold text-secondary">Masuk ruang coach ↗</span></button>)}</div>
    <div className="card flex flex-wrap items-center justify-between gap-4 rounded-2xl p-5"><div><p className="text-sm font-semibold">Administrasi & laporan</p><p className="mt-1 text-xs text-on-surface-variant">Kelola penugasan dan rekap penilaian siswi.</p></div><button disabled={!enabled} onClick={() => open("admin")} className="rounded-xl bg-primary px-4 py-3 text-xs font-semibold text-white disabled:opacity-40">Masuk admin</button></div>
    {target && <CoachLoginDialog eskul={target === "admin" ? undefined : target} coachName={target === "admin" ? "Admin" : `Coach ${ESKUL_META[target].label}`} username={username} onUsername={setUsername} password={password} onPassword={setPassword} busy={busy} error={message} onSubmit={login} onClose={() => { if (!busy) {setTarget(null);setPassword("");} }} />}
  </main>;
}
