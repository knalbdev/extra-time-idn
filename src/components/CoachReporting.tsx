"use client";
import Image from "next/image";
import type { Student } from "@/lib/students";
import { useEffect, useState } from "react";
import { coachLabel, Coach, GRADES } from "@/lib/assessments";
import { GENERAL_DESCRIPTORS, Meeting, PERIODS, reportCsv, reportRows, SessionData } from "@/lib/coach-sessions";
import { buildReportSlides } from "@/lib/report-slides";
import { ESKUL_META } from "@/lib/constants";
import { EskulKey } from "@/lib/types";
import { action, field, subtle } from "./CoachSessionForms";
import { AttendanceBadge } from "./AttendanceBadge";
import { usePortalFeedback } from "./PortalFeedback";

const dateLabel = (date: string) => new Date(`${date}T12:00:00+07:00`).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" });
type Snapshot = { meetings: Meeting[]; records: SessionData["records"]; generatedAt: string };

export function CoachReporting({ coach, eskul, data, students }: { students: Student[]; coach: Coach; eskul: EskulKey; data: SessionData }) {
  const { busy, run, notify } = usePortalFeedback();
  const [period, setPeriod] = useState("all");
  const [level, setLevel] = useState("all");
  const [className, setClassName] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [report, setReport] = useState<Snapshot | null>(null);
  const [slideIndex, setSlideIndex] = useState(0);
  useEffect(() => {
    if (report) requestAnimationFrame(() => document.getElementById("report-preview")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, [report]);
  const meetings = data.meetings.filter(m => m.coachId === coach.id && m.eskul === eskul);
  const classes = [...new Set(meetings.filter(m => level === "all" || (/^[789]/.test(m.className) ? "SMP" : "SMK") === level).map(m => m.className))];
  const scoped = meetings.filter(m => (period === "all" || m.period === period) && (level === "all" || (/^[789]/.test(m.className) ? "SMP" : "SMK") === level) && (className === "all" || m.className === className) && (!from || m.date >= from) && (!to || m.date <= to)).sort((a,b) => a.date.localeCompare(b.date));
  const invalidRange = Boolean(from && to && from > to);
  const rows = report ? reportRows(report.meetings, report.records, students) : [];
  const slides = report ? buildReportSlides(report.meetings, report.records, students) : [];
  const totals = rows.reduce((total, row) => {
    for (const key of ["hadir", "izin", "sakit", "alpa", "unmarked"] as const) total[key] += row.counts[key];
    return total;
  }, { hadir: 0, izin: 0, sakit: 0, alpa: 0, unmarked: 0 });
  function generate() {
    void run("Sedang menyusun laporan…", async () => {
      setReport({ meetings: structuredClone(scoped), records: structuredClone(data.records), generatedAt: new Date().toISOString() });
      setSlideIndex(0);
      notify("Laporan siap dibaca. Gunakan navigasi slide atau simpan seluruh halaman sebagai PDF.");
    });
  }
  function download() {
    if (!report) return;
    void run("Sedang menyiapkan unduhan…", async () => {
      const url = URL.createObjectURL(new Blob([reportCsv(report.meetings, report.records, coachLabel([eskul]), students)], { type: "text/csv;charset=utf-8" }));
      const a = document.createElement("a"); a.href = url; a.download = `laporan-${eskul}-${new Date().toISOString().slice(0,10)}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      notify("File CSV sudah disiapkan. Periksa unduhan di perangkatmu.");
    });
  }
  async function print() {
    const ready = await run("Sedang menyiapkan halaman laporan…", async () => {
      await document.fonts.ready;
      await Promise.all(Array.from(document.querySelectorAll<HTMLImageElement>("#coach-report img")).map(img => img.decode()));
    });
    if (ready) {
      // Print after the loading dialog is removed from the browser's top layer.
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      window.print();
      notify("Pratinjau cetak sudah dibuka. Pilih Simpan sebagai PDF untuk menyimpan laporan.");
    }
  }
  return <div className="min-w-0 space-y-5">
    <section className="card rounded-2xl p-5 print-hide"><p className="eyebrow">LAPORAN EKSKUL</p><h2 className="mt-2 font-heading text-2xl font-bold text-primary">Cerita perkembangan, tersaji jelas.</h2><p className="mt-2 text-sm leading-relaxed text-on-surface-variant">Susun laporan bergaya presentasi: cover, ringkasan kehadiran, dan penilaian setiap pertemuan. Materi ditulis sekali agar hasil tiap siswi mudah dibandingkan.</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-xs font-semibold">Periode laporan<select aria-label="Periode laporan" value={period} onChange={e => { setPeriod(e.target.value); setReport(null); }} className={field}><option value="all">Semua semester</option>{PERIODS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}</select></label>
        <label className="text-xs font-semibold">Jenjang laporan<select aria-label="Jenjang laporan" value={level} onChange={e => { setLevel(e.target.value); setClassName("all"); setReport(null); }} className={field}><option value="all">Semua jenjang</option>{["SMP", "SMK"].map(l => <option key={l}>{l}</option>)}</select></label>
        <label className="text-xs font-semibold">Kelas laporan<select aria-label="Kelas laporan" value={className} onChange={e => { setClassName(e.target.value); setReport(null); }} className={field}><option value="all">Semua kelas pertemuan</option>{classes.map(c => <option key={c}>{c}</option>)}</select></label>
        <label className="text-xs font-semibold">Dari tanggal<input type="date" value={from} onChange={e => { setFrom(e.target.value); setReport(null); }} className={field} /></label><label className="text-xs font-semibold">Sampai tanggal<input type="date" value={to} onChange={e => { setTo(e.target.value); setReport(null); }} className={field} /></label>
      </div>{invalidRange && <p role="alert" className="mt-3 text-xs text-red-700">Tanggal akhir harus sama atau setelah tanggal awal.</p>}
      <div className="mt-5 flex flex-wrap items-center gap-3"><button disabled={busy || !scoped.length || invalidRange} onClick={generate} className={action}>Generate laporan</button><span className="text-xs text-on-surface-variant">{scoped.length} pertemuan sesuai filter</span></div>
      {!scoped.length && <p className="mt-3 text-xs text-on-surface-variant">Belum ada pertemuan yang sesuai. Ubah filter atau tunggu pencatatan pertemuan oleh coach.</p>}
    </section>
    {report && <>
      <div className="print-hide flex flex-wrap items-center justify-between gap-3"><p className="max-w-lg text-xs leading-relaxed text-on-surface-variant">Laporan memakai data saat dibuat. Generate ulang setelah ada perubahan nilai. PDF memuat semua slide, termasuk yang tidak sedang ditampilkan.</p><div className="flex flex-wrap gap-2"><button disabled={busy} onClick={download} className={subtle}>Unduh CSV</button><button disabled={busy} onClick={print} className={action}>Cetak / Simpan PDF</button></div></div>
      <nav id="report-preview" aria-label="Navigasi slide laporan" className="print-hide scroll-mt-24 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-outline-variant bg-white p-3"><button disabled={slideIndex === 0 || busy} onClick={() => setSlideIndex(i => i - 1)} className={subtle}>← Sebelumnya</button><label className="flex items-center gap-2 text-xs font-semibold"><span>Slide</span><select aria-label="Pilih slide laporan" className="max-w-36 rounded-lg border border-outline-variant p-2 text-xs" value={slideIndex} onChange={e => setSlideIndex(Number(e.target.value))}>{slides.map((slide, i) => <option key={i} value={i}>{i + 1}. {slide.kind === "cover" ? "Cover" : slide.kind === "overview" ? "Ringkasan" : slide.kind === "summary" ? `Rekap ${slide.className}` : slide.meeting.title}</option>)}</select><span>/ {slides.length}</span></label><button disabled={slideIndex === slides.length - 1 || busy} onClick={() => setSlideIndex(i => i + 1)} className={subtle}>Berikutnya →</button></nav>
      <section id="coach-report" aria-label="Laporan ekstrakurikuler" className="min-w-0" aria-live="polite">
        {slides.map((slide, index) => <article key={index} data-slide={index + 1} className={`report-slide ${slide.kind === "cover" ? "report-cover" : ""} ${index === slideIndex ? "report-slide-active" : "report-slide-inactive"}`}>
          {slide.kind === "cover" ? <>
            <div className="report-cover-top"><Logo /><span className="report-chip">LAPORAN PERKEMBANGAN SISWI</span></div>
            <div className="report-cover-body"><p className="report-kicker">IDN AKHWAT · EKSTRAKURIKULER</p><h2>{ESKUL_META[eskul].label}</h2><p className="report-cover-subtitle">Setiap latihan, sebuah langkah maju.</p><p className="report-cover-description">Rekap kehadiran, penguasaan materi, dan catatan perkembangan siswi.</p><div className="report-cover-meta"><div><span>Rentang pertemuan</span><strong>{dateLabel(report.meetings[0].date)} – {dateLabel(report.meetings.at(-1)!.date)}</strong></div><div><span>Semester</span><strong>{[...new Set(report.meetings.map(m => PERIODS.find(p => p.key === m.period)?.label ?? m.period))].join(" · ")}</strong></div><div><span>Kelas / jenjang</span><strong>{[...new Set(rows.map(r => r.student.className))].join(", ")} · {[...new Set(rows.map(r => r.student.level))].join(" / ")}</strong></div></div></div>
            <div className="report-cover-stats"><CoverStat value={report.meetings.length} label="Pertemuan" /><CoverStat value={rows.length} label="Siswi" /><CoverStat value={new Set(report.meetings.map(m => m.className)).size} label="Kelas" /></div>
          </> : <>
            <div className="report-slide-heading"><div><p className="report-kicker">{ESKUL_META[eskul].label} / {slide.kind === "overview" ? "GAMBARAN UMUM" : slide.kind === "summary" ? `REKAP KELAS ${slide.className}` : `KELAS ${slide.meeting.className} · ${dateLabel(slide.meeting.date)}`}</p><h3>{slide.kind === "overview" ? "Kehadiran & panduan membaca" : slide.kind === "summary" ? "Rekap kehadiran siswi" : slide.meeting.title}</h3></div><Logo /></div>
            {slide.kind === "overview" ? <>
              <div className="report-stat-grid">{[{label:"Hadir",value:totals.hadir,color:"green"},{label:"Izin",value:totals.izin,color:"amber"},{label:"Sakit",value:totals.sakit,color:"orange"},{label:"Alpa",value:totals.alpa,color:"red"},{label:"Belum dicatat",value:totals.unmarked,color:"slate"}].map(item => <div key={item.label} className={`report-stat report-stat-${item.color}`}><span>{item.label}</span><strong>{item.value}</strong></div>)}</div>
              <p className="report-help">Angka di atas menghitung catatan siswi pada seluruh pertemuan dalam laporan. Kehadiran yang belum dicatat tetap ditampilkan terpisah.</p>
              <div className="report-overview-grid"><div><h4>Panduan predikat</h4><dl className="report-grade-legend">{GRADES.map(grade => <div key={grade}><dt>{grade}</dt><dd>{GENERAL_DESCRIPTORS[grade]}</dd></div>)}</dl></div><div className="report-reading-guide"><h4>Cara membaca laporan</h4><p>Rekap kehadiran dikelompokkan per kelas. Persentase hadir dihitung dari seluruh pertemuan kelas dalam laporan.</p><p>Materi dan konteks ditulis di bagian atas setiap pertemuan. Di bawahnya, bandingkan kehadiran, predikat, dan catatan tiap siswi.</p><p>Tanda <strong>—</strong> berarti belum dinilai atau tidak hadir. Nilai dari materi yang berbeda ditampilkan masing-masing.</p><p>Catatan panjang dilanjutkan ke baris atau slide berikutnya agar seluruh arahan coach tetap terbaca.</p></div></div>
            </> : slide.kind === "summary" ? <>
              <p className="report-help">{report.meetings.filter(m => m.className === slide.className).length} pertemuan kelas · Persentase hadir = jumlah hadir ÷ seluruh pertemuan kelas.</p>
              <p className="print-hide mb-3 text-xs text-on-surface-variant sm:hidden">Geser tabel ke samping untuk melihat seluruh rekap.</p><div className="report-table-wrap"><table className="report-data-table report-summary-table"><thead><tr>{["Nama siswi", "Hadir", "Izin", "Sakit", "Alpa", "Belum dicatat", "% hadir"].map(h => <th key={h} scope="col">{h}</th>)}</tr></thead><tbody>{slide.rows.map(({ student, counts, entries }) => <tr key={student.id}><th scope="row">{student.name}</th><td className="report-count-green">{counts.hadir}</td><td>{counts.izin}</td><td>{counts.sakit}</td><td className="report-count-red">{counts.alpa}</td><td>{counts.unmarked}</td><td><strong>{Math.round(counts.hadir / entries.length * 100)}%</strong></td></tr>)}</tbody></table></div>
            </> : slide.kind === "meeting" ? <>
              <div className="report-meeting-context"><div><span>Materi / skill inti</span><strong>{slide.meeting.skill}</strong></div><div><span>Semester</span><strong>{PERIODS.find(p => p.key === slide.meeting.period)?.label ?? slide.meeting.period}</strong></div>{slide.part > 1 && <span className="report-continuation">Lanjutan {slide.part}</span>}</div>
              <div className="report-table-wrap"><table className="report-data-table report-detail-table"><thead><tr>{["Nama siswi", "Kehadiran", "Predikat", "Catatan coach"].map(h => <th key={h} scope="col">{h}</th>)}</tr></thead><tbody>{slide.rows.map((row, i) => <tr key={`${row.student.id}-${i}`}><th scope="row">{row.student.name}{row.continuation && <small>Catatan lanjutan</small>}</th><td><AttendanceBadge value={row.record?.attendance} /></td><td><strong className="report-grade">{row.record?.attendance === "hadir" ? slide.meeting.rubric.map(c => row.record?.grades[c.id] ?? "—").join(" / ") : "—"}</strong></td><td className="report-note">{row.notes || (row.record ? "—" : "Belum dicatat")}</td></tr>)}</tbody></table></div>
            </> : null}
          </>}
          <footer className="report-slide-footer"><span>IDN Akhwat · {ESKUL_META[eskul].label} · Dibuat {new Date(report.generatedAt).toLocaleDateString("id-ID", { timeZone:"Asia/Jakarta" })}</span><strong>{String(index + 1).padStart(2,"0")} / {String(slides.length).padStart(2,"0")}</strong></footer>
        </article>)}
      </section>
    </>}
  </div>;
}
function Logo() { return <Image unoptimized loading="eager" src="/idn.png" alt="Logo IDN" width={138} height={64} className="report-logo" />; }
function CoverStat({value,label}:{value:number;label:string}) { return <div><strong>{value.toString().padStart(2,"0")}</strong><span>{label}</span></div>; }
