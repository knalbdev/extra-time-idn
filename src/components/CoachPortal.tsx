"use client";
import { useEffect, useState } from "react";
import { refreshPortalAction, saveMeetingAction, saveRecordAction, signOutAction } from "@/app/coach/actions";
import { coachLabel } from "@/lib/assessments";
import { isComplete, Meeting, PERIODS, recordKey } from "@/lib/coach-sessions";
import { ESKUL_META } from "@/lib/constants";
import type { PortalData } from "@/lib/portal-types";
import type { EskulKey } from "@/lib/types";
import { CoachManagement } from "./CoachManagement";
import { MeetingForm, StudentMeetingForm, field, subtle } from "./CoachSessionForms";
import { AdminCoachReporting } from "./AdminCoachReporting";
import { PageHeading } from "./PageHeading";
import { AttendanceBadge } from "./AttendanceBadge";
import { PortalFeedbackProvider, usePortalFeedback } from "./PortalFeedback";

export function CoachPortal({ initial }: { initial: PortalData }) {
  return <PortalFeedbackProvider><PortalWorkspace initial={initial} /></PortalFeedbackProvider>;
}

function PortalWorkspace({ initial }: { initial: PortalData }) {
  const { busy, run, notify, ask } = usePortalFeedback();
  const [portal, setPortal] = useState(initial);
  const data = portal.sessions;
  const [eskulChoice, setEskulChoice] = useState<EskulKey | undefined>(initial.coaches.find(c => c.id === initial.profile.id)?.eskuls[0]);
  const [adminTab, setAdminTab] = useState<"management" | "reporting">("management");
  const [meetingId, setMeetingId] = useState<string | null>(null);
  const [form, setForm] = useState<"new" | "edit" | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [level, setLevel] = useState("all");
  const [className, setClassName] = useState("all");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (!dirty) return;
    const handle = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handle);
    return () => window.removeEventListener("beforeunload", handle);
  }, [dirty]);
  const coach = portal.coaches.find(c => c.id === portal.profile.id && c.active);
  const eskul = coach?.eskuls.includes(eskulChoice!) ? eskulChoice : coach?.eskuls[0];
  const allowedClasses = [...new Set(portal.assignments.filter(a => a.user_id === portal.profile.id && a.extracurricular_id === eskul).map(a => a.class_id))];
  const meetings = data.meetings.filter(m => coach && m.coachId === coach.id && m.eskul === eskul).sort((a,b) => b.date.localeCompare(a.date));
  const meeting = meetings.find(m => m.id === meetingId);
  const student = portal.students.find(s => s.id === studentId && s.className === meeting?.className);
  const roster = portal.students.filter(s => s.className === meeting?.className);
  const visibleStudents = roster.filter(s => s.name.toLocaleLowerCase("id").includes(search.toLocaleLowerCase("id")) && (status === "all" || Boolean(data.records[recordKey(meeting!.id, s.id)]) === (status === "done")));
  const completeCount = meeting ? roster.filter(s => isComplete(meeting, data.records[recordKey(meeting.id, s.id)])).length : 0;
  const visibleMeetings = meetings.filter(m => (level === "all" || (/^[789]/.test(m.className) ? "SMP" : "SMK") === level) && (className === "all" || m.className === className));
  const meetingClasses = [...new Set(meetings.filter(m => level === "all" || (/^[789]/.test(m.className) ? "SMP" : "SMK") === level).map(m => m.className))];
  async function navigate(change: () => void) {
    if (busy) return;
    if (dirty && !await ask({ title: "Tinggalkan perubahan?", description: "Ada perubahan yang belum disimpan. Jika dilanjutkan, perubahan tersebut akan hilang.", confirmLabel: "Ya, lanjutkan" })) return;
    setDirty(false); change();
  }
  async function requestLogout() {
    if (!await ask({ title: "Keluar dari akun?", description: dirty ? "Ada perubahan yang belum disimpan. Jika keluar sekarang, perubahan tersebut akan hilang." : "Kamu bisa masuk kembali kapan saja menggunakan akun yang diberikan admin.", confirmLabel: "Ya, keluar" })) return;
    void run("Sedang keluar dari akun…", async () => {
      const result = await signOutAction();
      if (!result.ok) notify(result.error, "error");
      else setDirty(false);
    });
  }
  function saveMeeting(m: Meeting) {
    void run("Sedang menyimpan pertemuan…", async () => {
      const result = await saveMeetingAction(m);
      if (!result.ok) { notify(result.error, "error"); return; }
      setPortal(result.data); setDirty(false); setMeetingId(m.id); setForm(null); setStudentId(null); notify("Pertemuan berhasil disimpan. Kamu bisa mulai mencatat kehadiran dan penilaian.");
    });
  }
  function refreshData() {
    void navigate(() => { void run("Sedang memperbarui data…", async () => {
      const result = await refreshPortalAction();
      if (result.ok) { setPortal(result.data); setStudentId(null); setForm(null); notify("Data sudah diperbarui. Kamu sedang melihat catatan terbaru."); } else notify(result.error, "error");
    }); });
  }
  return <div className="min-h-screen bg-surface text-primary">
    <header className="print-hide sticky top-0 z-30 border-b border-outline-variant bg-white/95 backdrop-blur-xl"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-8"><div className="font-heading text-sm font-bold">IDN Akhwat<span className="mt-1 block text-[10px] font-medium tracking-widest text-on-surface-variant">{portal.profile.role === "admin" ? "ADMIN" : "COACH"} WORKSPACE</span></div><div className="flex flex-wrap gap-2"><button disabled={busy} className={subtle} onClick={refreshData}>Refresh data</button><button disabled={busy} className={subtle} onClick={requestLogout}>Keluar akun</button></div></div></header>
    <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-7 sm:px-8">
      {coach && coach.eskuls.length > 1 && <div className="print-hide flex flex-wrap gap-2">{coach.eskuls.map(key => <button disabled={busy} key={key} className={subtle} onClick={() => navigate(() => {setEskulChoice(key);setMeetingId(null);setStudentId(null);setForm(null);setLevel("all");setClassName("all");})}>{ESKUL_META[key].label}</button>)}</div>}
      {portal.profile.role === "admin" ? <><div className="print-hide"><PageHeading eyebrow="ADMINISTRASI" title={adminTab === "reporting" ? "Laporan ekstrakurikuler" : "Manajemen coach"} description="Kelola penugasan coach dan generate laporan absensi serta penilaian siswi." icon="manage_accounts" /></div><nav aria-label="Menu admin" className="print-hide flex flex-wrap gap-2 border-b border-outline-variant pb-3">{[{ key: "management", label: "Manajemen coach" }, { key: "reporting", label: "Reporting ekskul" }].map(item => <button key={item.key} onClick={() => setAdminTab(item.key as typeof adminTab)} className={`rounded-xl px-4 py-3 text-xs font-semibold ${adminTab === item.key ? "bg-primary text-white" : "bg-white text-on-surface-variant"}`}>{item.label}</button>)}</nav>{adminTab === "reporting" ? <AdminCoachReporting coaches={portal.coaches} data={data} students={portal.students} /> : <><CoachManagement portal={portal} onSaved={setPortal} /></>}</> : coach && eskul ? <>
        <div className="print-hide"><PageHeading eyebrow={`${coachLabel([eskul])} · ${coach.levels.join(" / ")}`} title={`Ruang ${ESKUL_META[eskul].label}`} description="Catat materi latihan, kehadiran, dan predikat A–E untuk setiap proses belajar." icon="sports" /></div>
        {form ? <MeetingForm allowedClasses={allowedClasses} key={form === "edit" ? meetingId : "new"} coach={coach} eskul={eskul} existing={form === "edit" ? meeting : undefined} locked={Boolean(form === "edit" && meeting && Object.keys(data.records).some(k => k.startsWith(`${meeting.id}|`)))} disabled={busy} onDirty={() => setDirty(true)} onSave={saveMeeting} onCancel={() => navigate(() => setForm(null))} /> : meeting ? <>
          <div className="flex flex-wrap items-center justify-between gap-3"><button className={subtle} onClick={() => navigate(() => {setMeetingId(null);setStudentId(null);})}>← Semua pertemuan</button><button className={subtle} onClick={() => navigate(() => setForm("edit"))}>Detail materi</button></div>
          <section className="dashboard-hero rounded-2xl p-6 text-white"><p className="text-xs text-blue-100">{meeting.date} · Kelas {meeting.className} · {PERIODS.find(p => p.key === meeting.period)?.label}</p><h2 className="mt-3 font-heading text-2xl font-bold">{meeting.title}</h2><p className="mt-2 text-sm font-semibold">{meeting.skill}</p>{meeting.objective && <p className="mt-2 text-xs leading-relaxed text-blue-100">Target: {meeting.objective}</p>}<p className="mt-5 text-xs">{completeCount}/{roster.length} siswi selesai dicatat · {meeting.rubric.length === 1 ? "Penilaian materi inti" : `${meeting.rubric.length} kriteria rubrik sebelumnya`}</p></section>
          <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[1fr_410px]"><section className="card min-w-0 rounded-2xl p-4"><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold">Cari siswi<input type="search" className={field} value={search} onChange={e => navigate(() => {setSearch(e.target.value);setStudentId(null);})} placeholder="Nama siswi…" /></label><label className="text-xs font-semibold">Status pencatatan<select aria-label="Status pencatatan" className={field} value={status} onChange={e => navigate(() => {setStatus(e.target.value);setStudentId(null);})}><option value="all">Semua siswi</option><option value="done">Sudah dicatat</option><option value="pending">Belum dicatat</option></select></label></div><div className="mt-4 space-y-2">
              <div aria-hidden="true" className="hidden grid-cols-[minmax(0,1.5fr)_100px_65px_minmax(0,1fr)] gap-3 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-on-surface-variant xl:grid"><span>Siswi</span><span>Kehadiran</span><span>Predikat</span><span>Catatan</span></div>
              {visibleStudents.map(s => { const r = data.records[recordKey(meeting.id,s.id)]; return <button key={s.id} aria-label={`Nilai ${s.name}`} onClick={() => navigate(() => { setStudentId(s.id); if (window.matchMedia("(max-width: 1023px)").matches) requestAnimationFrame(() => document.getElementById("meeting-student-form")?.scrollIntoView({block:"start",behavior:"smooth"})); })} className={`grid w-full grid-cols-2 gap-3 rounded-xl border p-3 text-left xl:grid-cols-[minmax(0,1.5fr)_100px_65px_minmax(0,1fr)] xl:items-start ${studentId === s.id ? "border-blue-300 bg-blue-50" : "border-outline-variant/60 hover:bg-surface"}`}>
                <span className="col-span-2 min-w-0 break-words text-sm font-semibold xl:col-span-1">{s.name}</span>
                <span><span className="mb-1 block text-[10px] text-on-surface-variant xl:hidden">Kehadiran</span><AttendanceBadge value={r?.attendance} /></span>
                <span><span className="mb-1 block text-[10px] text-on-surface-variant xl:hidden">Predikat</span><span className="inline-flex min-w-8 justify-center rounded-lg bg-indigo-50 px-2 py-1 text-xs font-bold text-indigo-800">{r?.attendance === "hadir" ? meeting.rubric.map(c => r.grades[c.id] ?? "—").join(" / ") : "—"}</span></span>
                <span className="col-span-2 min-w-0 whitespace-pre-wrap break-words text-xs leading-relaxed text-on-surface-variant xl:col-span-1"><span className="mb-1 block text-[10px] xl:hidden">Catatan</span>{r?.notes || (r ? "Belum ada catatan" : "—")}</span>
              </button>; })}{!visibleStudents.length && <p className="p-5 text-center text-xs text-on-surface-variant">Tidak ada siswi sesuai pencarian atau status ini.</p>}</div></section><div id="meeting-student-form" className="min-w-0 scroll-mt-28 lg:sticky lg:top-24">{student ? <StudentMeetingForm key={`${meeting.id}-${student.id}`} student={student} meeting={meeting} saved={data.records[recordKey(meeting.id,student.id)]} disabled={busy} onDirty={() => setDirty(true)} onSave={record => {
      if (!meeting || !student) return;
      void run("Sedang mengirim data penilaian…", async () => {
        const result = await saveRecordAction({ meetingId: meeting.id, studentId: student.id, attendance: record.attendance, grade: record.attendance === "hadir" ? record.grades.skill : null, notes: record.notes });
        if (result.ok) { setPortal(result.data); setDirty(false); notify(`Absensi dan penilaian ${student.name} berhasil disimpan.`); } else notify(result.error, "error");
      });
    }} /> : <div className="card rounded-2xl p-7"><p className="eyebrow">MULAI PENCATATAN</p><h3 className="mt-3 font-heading text-xl font-bold">Pilih siswi dari daftar</h3><p className="mt-3 text-xs leading-relaxed text-on-surface-variant">Isi kehadiran lebih dahulu. Untuk siswi yang hadir, pilih predikat A–E sesuai penguasaan materi dan tambahkan catatan bila diperlukan.</p></div>}</div></div>
        </> : <>
          <section className="dashboard-hero flex flex-wrap items-center justify-between gap-5 rounded-2xl p-6 text-white"><div><p className="text-[10px] tracking-widest text-blue-100">ALUR COACH</p><h2 className="mt-2 font-heading text-xl font-bold">Rencanakan → Latih → Nilai → Laporkan</h2><p className="mt-2 text-xs leading-relaxed text-blue-100">Cukup catat kelas dan materi inti. Standar predikat A–E sudah disediakan.</p></div><button disabled={busy || !allowedClasses.length} className="rounded-xl bg-white px-4 py-3 text-xs font-bold text-primary" onClick={() => navigate(() => setForm("new"))}>+ Buat pertemuan</button></section>
          <div className="card grid gap-4 rounded-2xl p-5 sm:grid-cols-2"><label className="text-xs font-semibold">Jenjang pertemuan<select aria-label="Jenjang pertemuan" className={field} value={level} onChange={e => {setLevel(e.target.value);setClassName("all");}}><option value="all">Semua jenjang penugasan</option>{coach.levels.map(l => <option key={l}>{l}</option>)}</select></label><label className="text-xs font-semibold">Filter kelas<select aria-label="Filter kelas" className={field} value={className} onChange={e => setClassName(e.target.value)}><option value="all">Semua kelas pertemuan</option>{meetingClasses.map(c => <option key={c}>{c}</option>)}</select></label></div>
          <div className="grid gap-4 md:grid-cols-2">{visibleMeetings.map(m => {const students=portal.students.filter(s=>s.className===m.className);const done=students.filter(s=>isComplete(m,data.records[recordKey(m.id,s.id)])).length;return <button key={m.id} onClick={() => {setMeetingId(m.id);setStudentId(null);setSearch("");setStatus("all");}} className="card rounded-2xl p-5 text-left transition hover:border-blue-200 hover:shadow-md"><p className="eyebrow">{m.date} · KELAS {m.className}</p><h3 className="mt-3 font-heading text-xl font-bold">{m.title}</h3><p className="mt-2 text-xs text-on-surface-variant">{m.skill}</p><div className="mt-5 h-1.5 overflow-hidden rounded-full bg-surface"><div className="h-full rounded-full bg-emerald-500" style={{width:`${done/students.length*100}%`}} /></div><p className="mt-3 text-xs text-on-surface-variant">{done}/{students.length} siswi selesai · {m.rubric.length === 1 ? "Materi inti" : `${m.rubric.length} kriteria sebelumnya`}</p><p className="mt-4 text-xs font-semibold text-secondary">Buka absensi & penilaian →</p></button>;})}</div>
          {!visibleMeetings.length && <div className="card rounded-2xl p-10 text-center"><h3 className="font-heading text-lg font-bold">Belum ada pertemuan sesuai filter</h3><p className="mt-2 text-xs leading-relaxed text-on-surface-variant">Buat pertemuan pertama, masukkan materi inti, lalu mulai mencatat siswi.</p></div>}
        </>}
      </> : <div className="card rounded-2xl p-6"><h2 className="font-heading text-xl font-bold">Belum ada ruang coach yang ditugaskan</h2><p className="mt-3 text-sm text-on-surface-variant">Hubungi admin untuk penugasan. Portal pendamping masih dalam pengembangan.</p></div>}
    </main>
  </div>;
}
