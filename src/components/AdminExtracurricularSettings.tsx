"use client";

import { updateExtracurricularAction } from "@/app/coach/actions";
import { ESKUL_META, ESKUL_ORDER } from "@/lib/constants";
import type { PortalData } from "@/lib/portal-types";
import type { EskulKey } from "@/lib/types";
import { EskulIcon } from "./EskulIcon";
import { usePortalFeedback } from "./PortalFeedback";
import { useExtracurriculars } from "./ExtracurricularProvider";

export function AdminExtracurricularSettings({ onSaved }: { onSaved: (portal: PortalData) => void }) {
  const { busy, ask, run, notify } = usePortalFeedback();
  const { enabledEskuls, setEnabled, available } = useExtracurriculars();
  async function toggle(id: EskulKey) {
    const active = !enabledEskuls.includes(id);
    const label = ESKUL_META[id].label;
    if (!await ask({ title: `${active ? "Aktifkan" : "Nonaktifkan"} ${label}?`, description: active
      ? "Jadwal, ruang coach, dan pilihan laporan akan ditampilkan kembali. Penugasan serta penilaian sebelumnya dapat digunakan kembali."
      : "Jadwal, ruang coach, dan pilihan laporan akan disembunyikan. Coach tidak dapat mengisi penilaian selama ekstrakurikuler dinonaktifkan. Seluruh data sebelumnya tetap tersimpan.", confirmLabel: active ? "Ya, aktifkan" : "Ya, nonaktifkan" })) return;
    void run("Sedang memperbarui status ekstrakurikuler…", async () => {
      const result = await updateExtracurricularAction({ id, active });
      if (!result.ok) { notify(result.error, "error"); return; }
      setEnabled(ESKUL_ORDER.filter(key => result.data.extracurriculars.some(item => item.id === key && item.is_active)));
      onSaved(result.data);
      notify(`${label} berhasil ${active ? "diaktifkan" : "dinonaktifkan"}.`);
    });
  }
  return <section className="space-y-5">
    <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 text-sm leading-relaxed text-primary"><p className="font-semibold">Atur ekstrakurikuler yang ditampilkan</p><p className="mt-2 text-on-surface-variant">Pengaturan ini berlaku untuk seluruh pengguna. Jadwal tetap bersumber dari spreadsheet. Menonaktifkan ekstrakurikuler tidak menghapus jadwal, penugasan, atau penilaian.</p><p className="mt-2 text-xs text-on-surface-variant">Halaman yang sedang terbuka menyesuaikan otomatis dalam sekitar 30 detik, saat dibuka kembali, atau setelah data diperbarui.</p></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{ESKUL_ORDER.map(key => {
      const active = enabledEskuls.includes(key);
      const meta = ESKUL_META[key];
      return <article key={key} className="card flex flex-col rounded-3xl p-6">
        <div className="flex items-start justify-between gap-3"><span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${meta.iconBg}`}><EskulIcon eskul={key} className={`h-6 w-6 ${meta.iconColor}`} /></span><span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${active ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>{active ? "Aktif" : "Nonaktif"}</span></div>
        <h2 className="mt-5 font-heading text-xl font-bold">{meta.label}</h2><p className="mb-6 mt-2 text-xs leading-relaxed text-on-surface-variant">{active ? "Jadwal dan ruang coach ditampilkan. Penilaian dapat dilakukan sesuai penugasan." : "Kegiatan dijeda. Jadwal dan ruang coach disembunyikan hingga diaktifkan kembali."}</p>
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-outline-variant pt-4"><span className="text-xs font-semibold">{active ? "Ditampilkan" : "Disembunyikan"}</span><button type="button" role="switch" aria-label={`Aktifkan ${meta.label}`} aria-checked={active} disabled={busy || !available} onClick={() => void toggle(key)} className={`relative h-7 w-12 shrink-0 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-secondary disabled:opacity-50 ${active ? "bg-emerald-500" : "bg-slate-300"}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${active ? "left-1 translate-x-5" : "left-1"}`} /></button></div>
      </article>;
    })}</div>
  </section>;
}
