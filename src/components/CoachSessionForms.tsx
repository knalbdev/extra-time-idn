"use client";

import { FormEvent, useState } from "react";
import { Coach, GRADES, Grade } from "@/lib/assessments";
import { ATTENDANCE, Attendance, GENERAL_DESCRIPTORS, defaultCriterion, Meeting, MeetingRecord, PERIODS } from "@/lib/coach-sessions";
import { attendanceColors } from "./AttendanceBadge";
import { isoToday } from "@/lib/format";
import type { Student } from "@/lib/students";
import { EskulKey } from "@/lib/types";

export const field = "mt-2 w-full min-w-0 rounded-xl border border-outline-variant bg-white px-3 py-3 text-sm text-primary focus:border-secondary focus:outline-none focus:ring-2 focus:ring-blue-100";
export const action = "inline-flex items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40";
export const subtle = "rounded-xl border border-outline-variant bg-white px-4 py-2.5 text-xs font-semibold text-primary hover:bg-blue-50 disabled:opacity-40";

export function MeetingForm({ coach, eskul, existing, locked, disabled, onSave, onCancel, onDirty, allowedClasses }: { allowedClasses: string[]; coach: Coach; eskul: EskulKey; existing?: Meeting; locked: boolean; disabled: boolean; onSave: (meeting: Meeting) => void; onCancel: () => void; onDirty: () => void }) {
  const [stableId] = useState(() => existing?.id ?? crypto.randomUUID());
  const [title, setTitle] = useState(existing?.title ?? "");
  const [date, setDate] = useState(existing?.date ?? isoToday());
  const [period, setPeriod] = useState(existing?.period ?? PERIODS[0].key);
  const classes = allowedClasses;
  const [className, setClassName] = useState(existing?.className ?? classes[0] ?? "");
  const [skill, setSkill] = useState(existing?.skill ?? "");

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !skill.trim() || !classes.includes(className)) return;
    onSave({ id: stableId, coachId: coach.id, eskul, title: title.trim(), date, period, className, skill: skill.trim(), objective: existing?.objective ?? "", rubric: [existing?.rubric.length === 1 ? { ...existing.rubric[0], title: skill.trim(), descriptors: { ...GENERAL_DESCRIPTORS } } : defaultCriterion(skill.trim())] });
  }
  return <form onSubmit={submit} onChange={onDirty} className="card min-w-0 rounded-2xl p-5 sm:p-7">
    <p className="eyebrow">RENCANA PEMBELAJARAN</p><h2 className="mt-2 font-heading text-2xl font-bold text-primary">{existing ? "Detail materi pertemuan" : "Buat pertemuan"}</h2>
    {locked && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">Pertemuan sudah memiliki catatan siswi. Materi dan konteks pertemuan dikunci agar arti nilai tetap konsisten. Buat pertemuan baru untuk materi atau skill berikutnya.</p>}
    <fieldset disabled={locked || disabled} className="mt-5 space-y-5 disabled:opacity-70">
      <div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-semibold">Nama pertemuan<input required maxLength={120} value={title} onChange={e => setTitle(e.target.value)} className={field} placeholder="Pertemuan 1 · Pengenalan dasar" /></label><label className="text-xs font-semibold">Tanggal<input required type="date" value={date} onChange={e => setDate(e.target.value)} className={field} /></label><label className="text-xs font-semibold">Kelas pertemuan<select aria-label="Kelas pertemuan" value={className} onChange={e => setClassName(e.target.value)} className={field}>{classes.map(c => <option key={c}>{c}</option>)}</select></label><label className="text-xs font-semibold">Semester<select aria-label="Semester" className={field} value={period} onChange={e => setPeriod(e.target.value)}>{PERIODS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}</select></label></div>
      <label className="block text-xs font-semibold">Materi / skill kemampuan inti<input required maxLength={160} value={skill} onChange={e => setSkill(e.target.value)} className={field} placeholder="Contoh: pernapasan dasar dan mengapung" /></label>
      {locked && existing && <div className="rounded-xl bg-blue-50 p-3 text-xs leading-relaxed">Pertemuan tersimpan mempertahankan materi dan standar penilaiannya. Standar umum di bawah berlaku untuk pertemuan baru; nilai dan deskripsi lama tetap tercantum pada laporan.</div>}
      <div className="rounded-2xl border border-outline-variant bg-surface/60 p-4"><h3 className="text-sm font-bold text-primary">Standar predikat A–E sudah tersedia</h3><p className="mt-2 text-xs leading-relaxed text-on-surface-variant">Coach cukup mengisi materi atau skill inti. Saat menilai siswi, pilih satu predikat lalu tambahkan catatan bila diperlukan.</p><dl className="mt-4 space-y-3">{GRADES.map(g => <div key={g} className="flex items-start gap-3"><dt className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-blue-100 bg-white text-xs font-bold text-secondary">{g}</dt><dd className="text-xs leading-relaxed text-on-surface-variant">{GENERAL_DESCRIPTORS[g]}</dd></div>)}</dl></div>
    </fieldset>
    <div className="mt-6 flex flex-wrap gap-3">{!locked && <button className={action} disabled={disabled}>Simpan pertemuan</button>}<button type="button" onClick={onCancel} className={subtle}>{locked ? "Kembali" : "Batal"}</button></div>
  </form>;
}

export function StudentMeetingForm({ student, meeting, saved, disabled, onSave, onDirty }: { student: Student; meeting: Meeting; saved?: MeetingRecord; disabled: boolean; onSave: (record: MeetingRecord) => void; onDirty: () => void }) {
  const [attendance, setAttendance] = useState<Attendance | "">(saved?.attendance ?? "");
  const [grades, setGrades] = useState<Record<string, Grade>>(saved?.grades ?? {});
  const [notes, setNotes] = useState(saved?.notes ?? "");
  const complete = Boolean(attendance && (attendance !== "hadir" || meeting.rubric.every(c => grades[c.id])));
  function submit(e: FormEvent) { e.preventDefault(); if (!attendance || !complete) return; onSave({ attendance, grades: attendance === "hadir" ? grades : {}, notes: notes.trim(), updatedAt: new Date().toISOString() }); }
  return <form onSubmit={submit} onChange={onDirty} className="card min-w-0 rounded-2xl p-5">
    <fieldset disabled={disabled} className="min-w-0">
    <p className="eyebrow">ABSENSI & PENILAIAN</p><h3 className="mt-2 break-words font-heading text-xl font-bold text-primary">{student.name}</h3><p className="mt-1 text-xs text-on-surface-variant">{student.className} · {meeting.title}</p>
    <fieldset className="mt-5"><legend className="text-sm font-semibold">Kehadiran</legend><div className="mt-3 grid grid-cols-2 gap-2">{Object.entries(ATTENDANCE).map(([value, label]) => <label key={value} className={`flex items-center gap-2 rounded-xl border px-3 py-3 text-xs font-semibold ${attendance === value ? `${attendanceColors[value as Attendance]} ring-1 ring-current` : "border-outline-variant"}`}><input type="radio" required name="attendance" value={value} checked={attendance === value} onChange={() => { setAttendance(value as Attendance); if (value !== "hadir") setGrades({}); }} />{label}</label>)}</div></fieldset>
    {attendance === "hadir" ? <div className="mt-5 space-y-5">{meeting.rubric.map(c => <fieldset key={c.id}><legend className="text-sm font-semibold text-primary">{c.title}</legend><div className="mt-2 flex flex-col gap-2">{GRADES.map(g => <label key={g} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-xs leading-relaxed ${grades[c.id] === g ? "border-secondary bg-blue-50" : "border-outline-variant"}`}><input type="radio" required name={c.id} aria-label={`${c.title} ${g}`} checked={grades[c.id] === g} onChange={() => setGrades({ ...grades, [c.id]: g })} className="mt-0.5" /><span><strong className="mr-2 text-secondary">{g}</strong>{c.descriptors[g]}</span></label>)}</div></fieldset>)}</div> : <p className="mt-4 rounded-xl bg-surface p-3 text-xs leading-relaxed text-on-surface-variant">{attendance ? "Siswi yang tidak hadir dicatat absensinya, tanpa nilai keterampilan. Nilai kosong tidak dianggap sebagai predikat E." : "Pilih kehadiran terlebih dahulu. Pilihan predikat A–E muncul untuk siswi yang hadir."}</p>}
    <label className="mt-5 block text-xs font-semibold">Catatan coach (opsional)<textarea aria-label="Catatan coach (opsional)" maxLength={2000} rows={3} value={notes} onChange={e => setNotes(e.target.value)} className={field} placeholder="Perkembangan, arahan latihan, atau keterangan kehadiran…" /></label>
    <button disabled={!complete || disabled} className={`${action} mt-5 w-full`}>Simpan absensi & penilaian</button><p className="mt-3 text-[11px] text-on-surface-variant">{saved ? `Terakhir disimpan ${new Date(saved.updatedAt).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB` : "Belum ada catatan tersimpan untuk pertemuan ini."}</p>
    </fieldset>
  </form>;
}
