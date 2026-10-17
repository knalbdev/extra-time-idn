"use client";
import type { Student } from "@/lib/students";
import { useState } from "react";
import { coachLabel, Coach } from "@/lib/assessments";
import { ATTENDANCE, Meeting, PERIODS, reportCsv, reportRows, SessionData } from "@/lib/coach-sessions";
import { ESKUL_META } from "@/lib/constants";
import { EskulKey } from "@/lib/types";
import { action, field, subtle } from "./CoachSessionForms";

export function CoachReporting({ coach, eskul, data, students }: { students: Student[]; coach: Coach; eskul: EskulKey; data: SessionData }) {
  const [period, setPeriod] = useState("all");
  const [level, setLevel] = useState("all");
  const [className, setClassName] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [report, setReport] = useState<{ meetings: Meeting[]; records: SessionData["records"]; generatedAt: string } | null>(null);
  const meetings = data.meetings.filter(m => m.coachId === coach.id && m.eskul === eskul);
  const classes = [...new Set(meetings.filter(m => level === "all" || (/^[789]/.test(m.className) ? "SMP" : "SMK") === level).map(m => m.className))];
  const scoped = meetings.filter(m => (period === "all" || m.period === period) && (level === "all" || (/^[789]/.test(m.className) ? "SMP" : "SMK") === level) && (className === "all" || m.className === className) && (!from || m.date >= from) && (!to || m.date <= to)).sort((a,b) => a.date.localeCompare(b.date));
  const invalidRange = Boolean(from && to && from > to);
  const rows = report ? reportRows(report.meetings, report.records, students) : [];
  function download() {
    if (!report) return;
    const url = URL.createObjectURL(new Blob([reportCsv(report.meetings, report.records, coachLabel([eskul]), students)], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = `laporan-${eskul}-${new Date().toISOString().slice(0,10)}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <div className="space-y-5">
    <section className="card rounded-2xl p-5 print-hide"><p className="eyebrow">REPORTING EKSKUL</p><h2 className="mt-2 font-heading text-2xl font-bold text-primary">Dari latihan menjadi laporan</h2><p className="mt-2 text-xs leading-relaxed text-on-surface-variant">Generate rekap absensi dan nilai tiap siswi. Predikat A–E dan catatan ditampilkan per materi pertemuan; tidak dirata-ratakan antar teknik yang berbeda.</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-xs font-semibold">Periode laporan<select aria-label="Periode laporan" value={period} onChange={e => { setPeriod(e.target.value); setReport(null); }} className={field}><option value="all">Semua semester</option>{PERIODS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}</select></label>
        <label className="text-xs font-semibold">Jenjang laporan<select aria-label="Jenjang laporan" value={level} onChange={e => { setLevel(e.target.value); setClassName("all"); setReport(null); }} className={field}><option value="all">Semua jenjang</option>{["SMP", "SMK"].map(l => <option key={l}>{l}</option>)}</select></label>
        <label className="text-xs font-semibold">Kelas laporan<select aria-label="Kelas laporan" value={className} onChange={e => { setClassName(e.target.value); setReport(null); }} className={field}><option value="all">Semua kelas pertemuan</option>{classes.map(c => <option key={c}>{c}</option>)}</select></label>
        <label className="text-xs font-semibold">Dari tanggal<input type="date" value={from} onChange={e => { setFrom(e.target.value); setReport(null); }} className={field} /></label><label className="text-xs font-semibold">Sampai tanggal<input type="date" value={to} onChange={e => { setTo(e.target.value); setReport(null); }} className={field} /></label>
      </div>{invalidRange && <p role="alert" className="mt-3 text-xs text-red-700">Tanggal akhir harus sama atau setelah tanggal awal.</p>}
      <div className="mt-5 flex flex-wrap items-center gap-3"><button disabled={!scoped.length || invalidRange} onClick={() => setReport({ meetings: structuredClone(scoped), records: structuredClone(data.records), generatedAt: new Date().toISOString() })} className={action}>Generate laporan</button><span className="text-xs text-on-surface-variant">{scoped.length} pertemuan sesuai filter</span></div>
      {!scoped.length && <p className="mt-3 text-xs text-on-surface-variant">Belum ada pertemuan yang sesuai. Ubah filter atau tunggu pencatatan pertemuan oleh coach.</p>}
    </section>
    {report && <><div className="print-hide flex flex-wrap items-center justify-between gap-3"><p role="status" className="text-xs text-on-surface-variant">Laporan dibuat dari data tersimpan. Generate ulang setelah memperbarui nilai.</p><div className="flex gap-2"><button onClick={download} className={subtle}>Unduh CSV</button><button onClick={() => window.print()} className={action}>Cetak / Simpan PDF</button></div></div>
      <section id="coach-report" className="card min-w-0 rounded-2xl p-5 sm:p-7"><p className="eyebrow">IDN AKHWAT · LAPORAN EKSTRAKURIKULER</p><h2 className="mt-2 font-heading text-2xl font-bold text-primary">{ESKUL_META[eskul].label} · {coachLabel([eskul])}</h2><p className="mt-2 text-xs leading-relaxed text-on-surface-variant">{report.meetings.length} pertemuan · {rows.length} siswi · {report.meetings[0]?.date} s.d. {report.meetings.at(-1)?.date}<br />Dibuat {new Date(report.generatedAt).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB · Data Supabase</p>
        <h3 className="mt-7 text-base font-bold text-primary">Rekap kehadiran per siswi</h3><p className="mt-1 text-xs text-on-surface-variant">Persentase hadir = hadir ÷ seluruh pertemuan kelas pada laporan. Data belum dicatat tetap ditampilkan terpisah.</p>
        <div className="report-table mt-4 overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-surface"><tr>{["Siswi / kelas", "Hadir", "Izin", "Sakit", "Alpa", "Belum dicatat", "% hadir"].map(h => <th key={h} className="whitespace-nowrap p-3">{h}</th>)}</tr></thead><tbody>{rows.map(({student,counts,entries}) => <tr key={student.id} className="border-b border-outline-variant"><td className="min-w-44 p-3 font-semibold">{student.name}<span className="mt-1 block text-[10px] font-normal text-on-surface-variant">{student.level} · {student.className}</span></td>{[counts.hadir, counts.izin, counts.sakit, counts.alpa, counts.unmarked, `${Math.round(counts.hadir / entries.length * 100)}%`].map((count,i) => <td className="p-3" key={i}>{count}</td>)}</tr>)}</tbody></table></div>
        <h3 className="mt-8 text-base font-bold text-primary">Rincian penilaian & absensi</h3><div className="mt-4 space-y-5">{rows.map(({student,entries}) => <article key={student.id} className="report-student rounded-xl border border-outline-variant p-4"><h4 className="text-sm font-bold text-primary">{student.name} <span className="font-normal text-on-surface-variant">· {student.className}</span></h4><div className="mt-3 space-y-4">{entries.map(({meeting,record}) => <div key={meeting.id} className="border-t border-outline-variant pt-3"><div className="flex flex-wrap justify-between gap-2 text-xs"><strong>{meeting.date} · {meeting.title}</strong><span>{record ? ATTENDANCE[record.attendance] : "Belum dicatat"}</span></div><p className="mt-1 text-xs text-on-surface-variant">{meeting.skill} · {PERIODS.find(p => p.key === meeting.period)?.label}</p><ul className="mt-2 space-y-1">{meeting.rubric.map(c => { const grade = record?.grades[c.id]; return <li key={c.id} className="break-words text-xs leading-relaxed"><strong>{c.title}: {grade ?? "—"}</strong>{grade ? ` · ${c.descriptors[grade]}` : record && record.attendance !== "hadir" ? " · Tidak dinilai karena tidak hadir" : " · Belum dinilai"}</li>; })}</ul>{record?.notes && <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-relaxed">Catatan: {record.notes}</p>}</div>)}</div></article>)}</div>
      </section></>}
  </div>;
}
