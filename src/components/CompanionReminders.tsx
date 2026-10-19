"use client";

import { ESKUL_META } from "@/lib/constants";
import { formatLongIndo, formatShortIndo } from "@/lib/format";
import type { EskulEvent } from "@/lib/types";
import { ClassChip } from "./Badges";
import { EskulIcon } from "./EskulIcon";
import { Icon } from "./Icon";

export function CompanionReminders({ pending,unclocked,startsOn,today,error,busy,onSelect }: {
  pending:EskulEvent[];unclocked:EskulEvent[];startsOn?:string;today:string;error:string;busy:boolean;onSelect:(event:EskulEvent)=>void;
}) {
  const needsReport=pending.length>0;
  return <section aria-label="Pengingat laporan pendamping" className={`companion-reminders ${needsReport?"companion-reminders-pending":"companion-reminders-clear"}`}>
    <header className="flex min-w-0 flex-col items-start justify-between gap-4 sm:flex-row sm:gap-5">
      <div className="flex w-full min-w-0 flex-1 items-start gap-3 sm:w-auto sm:gap-4">
        <span aria-hidden className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl sm:h-14 sm:w-14 ${needsReport?"bg-amber-300 text-amber-950 shadow-[0_5px_18px_#f59e0b30]":"bg-emerald-100 text-emerald-800"}`}><Icon name={needsReport?"notifications_active":"task_alt"} className="text-2xl"/></span>
        <div className="min-w-0"><p className={`text-[10px] font-bold tracking-[.16em] ${needsReport?"text-amber-900":"text-emerald-800"}`}>PENGINGAT LAPORAN</p><h2 className="mt-2 font-heading text-xl font-bold leading-tight tracking-tight text-primary sm:text-2xl">{needsReport?`${pending.length} sesi belum memiliki laporan`:"Pengingat laporan kegiatan"}</h2><p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600">{needsReport?"Kegiatan telah berjalan. Isi laporan untuk sesi berikut.":"Pengingat muncul satu jam setelah kegiatan dimulai dan tetap tersedia sampai laporan masuk."}</p></div>
      </div>
      {needsReport&&<span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-amber-300 bg-white/80 px-3 py-2 text-xs font-bold text-amber-950"><span aria-hidden className="h-2 w-2 rounded-full bg-amber-600"/>Perlu dilengkapi</span>}
    </header>
    {error&&<p role="alert" className="mt-5 rounded-2xl border border-amber-300 bg-white p-4 text-sm leading-relaxed text-amber-950">{error}</p>}
    {startsOn&&<>
      {needsReport?<div className="mt-6 grid gap-4 md:grid-cols-2">{pending.map(event=>{
        const meta=ESKUL_META[event.eskul],overdue=event.date<today;
        return <article key={event.id} className="companion-reminder-card">
          <div className="flex items-center justify-between gap-3"><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${meta.iconBg}`}><EskulIcon eskul={event.eskul} className={`h-6 w-6 ${meta.iconColor}`}/></span><span className="rounded-full bg-amber-50 px-3 py-1.5 text-[11px] font-semibold text-amber-900">{overdue?"Laporan tertunda":"Hari ini"}</span></div>
          <p className="mt-4 font-heading text-lg font-bold leading-snug text-primary">Eskul {event.eskulLabel} belum ada laporan yang diisi.</p>
          <div className="mt-5 space-y-3 text-sm text-slate-600"><p className="flex items-start gap-2.5"><Icon name="calendar_today" className="mt-0.5 text-base text-slate-400"/><span>{formatLongIndo(event.date)}</span></p><p className="flex items-start gap-2.5"><Icon name="schedule" className="mt-0.5 text-base text-slate-400"/><span>{event.time} WIB</span></p><div className="flex items-start gap-2.5"><Icon name="groups" className="mt-0.5 text-base text-slate-400"/><div className="flex min-w-0 flex-wrap items-center gap-1.5"><span className="mr-1 text-xs">Kelas:</span>{event.classes.map(item=><ClassChip key={item} label={item}/>)}</div></div></div>
          <button type="button" disabled={busy} onClick={()=>onSelect(event)} className="companion-reminder-action">Isi laporan sekarang<Icon name="arrow_forward" className="text-lg"/></button>
        </article>;
      })}</div>:!error&&<div className="mt-5 flex items-start gap-3 rounded-2xl bg-emerald-50 p-4 text-sm leading-relaxed text-emerald-900"><Icon name="check_circle" className="mt-0.5 text-xl"/><p>Tidak ada sesi yang perlu diingatkan saat ini. Laporan yang sudah masuk tidak ditampilkan lagi di sini.</p></div>}
      {unclocked.length>0&&<div className="mt-5 rounded-2xl border border-amber-200 bg-white p-4 sm:p-5"><p className="text-sm font-semibold text-amber-950">Jam mulai perlu dilengkapi di jadwal</p><p className="mt-2 text-sm leading-relaxed text-slate-600">Pengingat satu jam belum dapat dihitung untuk sesi berikut. Laporan tetap dapat diisi.</p><ul className="mt-4 space-y-3">{unclocked.map(event=><li key={event.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant/60 pt-3 text-xs"><span className="min-w-0 break-words leading-relaxed">{event.eskulLabel} · {formatShortIndo(event.date)} · {event.classes.join(", ")} · {event.time}</span><button type="button" disabled={busy} onClick={()=>onSelect(event)} className="rounded-xl border border-outline-variant bg-white px-4 py-3 text-xs font-semibold text-primary">Isi laporan sekarang</button></li>)}</ul></div>}
      <p className="mt-5 flex items-start gap-2 text-[11px] leading-relaxed text-slate-600"><Icon name="update" className="mt-0.5 text-sm"/><span>Diperbarui otomatis setiap menit saat halaman terbuka. Berlaku mulai {formatLongIndo(startsOn)}.</span></p>
    </>}
  </section>;
}
