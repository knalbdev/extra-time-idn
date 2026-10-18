"use client";

import type { Student } from "@/lib/students";
import { useState } from "react";
import { coachLabel, Coach } from "@/lib/assessments";
import { SessionData } from "@/lib/coach-sessions";
import { ESKUL_META } from "@/lib/constants";
import { EskulKey } from "@/lib/types";
import { CoachReporting } from "./CoachReporting";
import { useExtracurriculars } from "./ExtracurricularProvider";
import { field } from "./CoachSessionForms";

export function AdminCoachReporting({ coaches, data, students }: { students: Student[]; coaches: Coach[]; data: SessionData }) {
  const { enabledEskuls } = useExtracurriculars();
  const [choice, setEskul] = useState<EskulKey>("renang");
  const eskul = enabledEskuls.includes(choice) ? choice : enabledEskuls[0];
  const [coachId, setCoachId] = useState("");
  if (!eskul) return <p className="card rounded-2xl p-6 text-sm">Belum ada ekstrakurikuler aktif. Aktifkan melalui menu Pengaturan ekskul untuk menyusun laporan.</p>;
  // Keep historical records available even after a coach is deactivated or reassigned.
  const ids = new Set(data.meetings.filter(m => m.eskul === eskul).map(m => m.coachId));
  const available = coaches.filter(c => c.eskuls.includes(eskul) || ids.has(c.id));
  for (const id of ids) if (!available.some(c => c.id === id)) available.push({ id, name: "Coach arsip", eskuls: [eskul], levels: ["SMP", "SMK"], active: false });
  const selected = available.find(c => c.id === coachId) ?? available[0];
  return <div className="space-y-5">
    <section className="card print-hide grid gap-4 rounded-2xl p-5 sm:grid-cols-2">
      <label className="text-xs font-semibold">Ekskul laporan<select aria-label="Ekskul laporan" className={field} value={eskul} onChange={e => { setEskul(e.target.value as EskulKey); setCoachId(""); }}>{enabledEskuls.map(k => <option value={k} key={k}>{ESKUL_META[k].label}</option>)}</select></label>
      <label className="text-xs font-semibold">Coach laporan<select aria-label="Coach laporan" className={field} disabled={!available.length} value={selected?.id ?? ""} onChange={e => setCoachId(e.target.value)}>{!available.length && <option value="">Belum ada coach atau data pertemuan</option>}{available.map(c => <option value={c.id} key={c.id}>{coachLabel([eskul])}{available.length > 1 ? ` · Akun ${available.indexOf(c) + 1}` : ""}{c.active ? "" : " · Nonaktif / arsip"}</option>)}</select></label>
    </section>
    {selected ? <CoachReporting key={`${eskul}-${selected.id}`} coach={selected} eskul={eskul} data={data} students={students} /> : <p className="card rounded-2xl p-6 text-sm text-on-surface-variant">Belum ada data untuk ekskul ini. Pilih ekskul lain atau atur penugasan coach.</p>}
  </div>;
}
