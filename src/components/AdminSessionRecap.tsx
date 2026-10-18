"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import { ESKUL_META, ESKUL_ORDER } from "@/lib/constants";
import { getAllEvents } from "@/lib/sheets";
import { buildSessionRecap, RECAP_COLORS, RECAP_COUNT_NOTE, recapDate, recapUpdated, SessionRecap, validRecapRange } from "@/lib/session-recap";
import type { EskulKey } from "@/lib/types";
import { action, field, subtle } from "./CoachSessionForms";
import { usePortalFeedback } from "./PortalFeedback";

function todayInJakarta() { return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Jakarta",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date()); }
export function AdminSessionRecap() {
  const { busy, run, notify } = usePortalFeedback();
  const [from,setFrom]=useState(()=>`${todayInJakarta().slice(0,7)}-01`);
  const [to,setTo]=useState(todayInJakarta);
  const [eskul,setEskul]=useState<EskulKey|"all">("all");
  const [recap,setRecap]=useState<SessionRecap|null>(null);
  const [error,setError]=useState("");
  const valid=validRecapRange(from,to);
  function invalidate() {setRecap(null);setError("");}
  function generate(event:FormEvent) {
    event.preventDefault();if(!valid||busy)return;
    void run("Sedang memuat rekap dari spreadsheet…",async()=>{
      setError("");setRecap(null);
      try {
        const events=await getAllEvents();
        const result=buildSessionRecap(events,from,to,eskul,new Date().toISOString());
        setRecap(result);
        notify(result.total?`Rekap berhasil disusun. Terdapat ${result.total} sesi terlaksana pada rentang yang dipilih.`:"Tidak ada sesi berstatus Sudah Terlaksana pada rentang yang dipilih.");
      } catch {
        const message="Data jadwal belum dapat dimuat. Periksa koneksi, lalu pilih Tampilkan rekap untuk mencoba kembali.";
        setError(message);notify(message,"error");
      }
    });
  }
  function download() {
    if(!recap)return;
    void run("Sedang menyiapkan gambar rekap…",async()=>{
      const {downloadSessionRecapPng}=await import("@/lib/session-recap-png");
      await downloadSessionRecapPng(recap);
      notify("Rekap PNG telah disiapkan. Silakan periksa folder unduhan.");
    });
  }
  return <div className="min-w-0 space-y-5">
    <form onSubmit={generate} className="card rounded-2xl p-5 sm:p-6">
      <p className="eyebrow">REKAP PELAKSANAAN</p><h2 className="mt-2 font-heading text-2xl font-bold">Sesi ekstrakurikuler terlaksana</h2>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-on-surface-variant">Rekap diambil dari spreadsheet jadwal dengan status “Sudah Terlaksana”. Pilih rentang tanggal untuk melihat jumlah sesi setiap ekstrakurikuler.</p>
      <fieldset disabled={busy} className="mt-5 grid gap-4 sm:grid-cols-3">
        <label className="text-xs font-semibold">Tanggal mulai rekap<input required type="date" value={from} onChange={event=>{setFrom(event.target.value);invalidate();}} className={field}/></label>
        <label className="text-xs font-semibold">Tanggal akhir rekap<input required type="date" value={to} onChange={event=>{setTo(event.target.value);invalidate();}} className={field}/></label>
        <label className="text-xs font-semibold">Ekstrakurikuler rekap<select aria-label="Ekstrakurikuler rekap" value={eskul} onChange={event=>{setEskul(event.target.value as EskulKey|"all");invalidate();}} className={field}><option value="all">Semua ekstrakurikuler</option>{ESKUL_ORDER.map(key=><option key={key} value={key}>{ESKUL_META[key].label}</option>)}</select></label>
      </fieldset>
      {!valid&&<p role="alert" className="mt-3 text-xs text-rose-700">Isi kedua tanggal. Tanggal akhir harus sama atau setelah tanggal mulai.</p>}
      <div className="mt-5 flex flex-wrap items-center gap-3"><button disabled={!valid||busy} className={action}>Tampilkan rekap</button><p className="text-xs text-on-surface-variant">Data terbaru dimuat setiap kali rekap ditampilkan.</p></div>
      {error&&<p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</p>}
    </form>
    {recap&&<>
      <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-on-surface-variant">PNG berukuran 1920 × 1080, siap digunakan dalam laporan atau presentasi.</p><button type="button" disabled={busy} onClick={download} className={subtle}>Unduh rekap PNG</button></div>
      <section aria-label="Hasil rekap sesi" className="min-w-0 overflow-hidden rounded-3xl border border-outline-variant bg-white">
        <header className="dashboard-hero flex flex-wrap items-start justify-between gap-5 p-6 text-white sm:p-8"><div><p className="text-[10px] font-semibold tracking-widest text-blue-200">IDN AKHWAT · PELAKSANAAN EKSTRAKURIKULER</p><h3 className="mt-3 font-heading text-2xl font-bold sm:text-3xl">Rekap Sesi Terlaksana</h3><p className="mt-3 text-sm">{recapDate(recap.from)} – {recapDate(recap.to)}</p><p className="mt-2 text-xs text-blue-100">{recap.eskul==="all"?"Seluruh ekstrakurikuler":ESKUL_META[recap.eskul].label}</p></div><Image unoptimized src="/idn.png" alt="Logo IDN" width={138} height={64} className="h-16 w-36 rounded-xl bg-white p-2 object-contain"/></header>
        <div className="space-y-6 p-5 sm:p-8">
          <dl className="grid gap-3 sm:grid-cols-3">{[{label:"Sesi terlaksana",value:recap.total},{label:"Hari pelaksanaan",value:recap.days},{label:"Ekstrakurikuler terlaksana",value:recap.activeEskuls}].map(item=><div key={item.label} className="rounded-2xl border border-outline-variant bg-surface p-4"><dt className="text-xs text-on-surface-variant">{item.label}</dt><dd className="mt-2 font-heading text-3xl font-bold">{item.value}</dd></div>)}</dl>
          {!recap.total&&<p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Tidak ada sesi berstatus “Sudah Terlaksana” pada rentang ini.</p>}
          <p className="text-[11px] text-on-surface-variant sm:hidden">Geser tabel ke samping untuk melihat seluruh rekap.</p>
          <div className="max-w-full overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><caption className="sr-only">Jumlah sesi terlaksana dari spreadsheet pada rentang tanggal yang dipilih</caption><thead className="bg-surface text-xs text-on-surface-variant"><tr>{["Ekstrakurikuler","Sesi terlaksana","Hari pelaksanaan","Tanggal terakhir"].map(label=><th key={label} scope="col" className="p-3">{label}</th>)}</tr></thead><tbody>{recap.rows.map(row=><tr key={row.eskul} className="border-b border-outline-variant"><th scope="row" className="p-3 font-semibold"><span className="mr-2 inline-block h-2 w-2 rounded-full" style={{background:RECAP_COLORS[row.eskul]}}/>{row.label}</th><td className="p-3 font-bold">{row.count}</td><td className="p-3">{row.days}</td><td className="p-3">{row.lastDate?recapDate(row.lastDate):"—"}</td></tr>)}</tbody></table></div>
          <div className="border-t border-outline-variant pt-4 text-xs leading-relaxed text-on-surface-variant"><p className="font-semibold text-primary">Sumber: spreadsheet jadwal · Status: “Sudah Terlaksana”</p><p className="mt-2">{RECAP_COUNT_NOTE}</p><p className="mt-2">Data diperbarui {recapUpdated(recap.fetchedAt)}</p></div>
        </div>
      </section>
      <details className="card rounded-2xl p-5"><summary className="cursor-pointer text-sm font-semibold">Rincian jadwal yang dihitung ({recap.total} sesi)</summary><div className="mt-4 space-y-3">{recap.events.map((event,index)=><div key={`${event.id}-${index}`} className="rounded-xl border border-outline-variant p-4 text-xs leading-relaxed"><p className="font-semibold">{event.eskulLabel} · {recapDate(event.date)} · {event.time}</p><p className="mt-1 text-on-surface-variant">{event.classes.join(", ")||"Kelas belum dicantumkan"} · {event.status}</p></div>)}{!recap.total&&<p className="text-xs text-on-surface-variant">Tidak ada jadwal yang memenuhi filter.</p>}</div></details>
    </>}
  </div>;
}
