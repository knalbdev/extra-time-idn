import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";
const loadExternal = createRequire(import.meta.url);
const cache = new Map();
function load(file) {
  const full = path.resolve(file);
  if (cache.has(full)) return cache.get(full);
  const source = ts.transpileModule(fs.readFileSync(full, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = { exports: {} };
  new Function('exports', 'module', 'require', source)(mod.exports, mod, id => id.startsWith('.') ? load(path.resolve(path.dirname(full), `${id}.ts`)) : loadExternal(id));
  cache.set(full, mod.exports);
  return mod.exports;
}
const rawModel = load('src/lib/coach-sessions.ts');
const students = load('src/lib/students.ts').STUDENTS;
const model = { ...rawModel, parseSessions: raw => rawModel.parseSessions(raw, students), reportRows: (meetings, records) => rawModel.reportRows(meetings, records, students), reportCsv: (meetings, records) => rawModel.reportCsv(meetings, records, 'Coach Renang', students) };
const criterion = { id: 'technique', title: 'Kontrol napas', descriptors: { A: 'Mandiri', B: 'Sedikit arahan', C: 'Perlu latihan', D: 'Perlu pendampingan', E: 'Pendampingan intensif' } };
const meeting = { id: 'm1', coachId: 'coach', eskul: 'renang', title: 'Latihan 1', date: '2026-10-17', period: '2026-2027-1', className: '7A', skill: 'Pernapasan', objective: 'Mampu mengatur napas', rubric: [criterion] };
const record = { attendance: 'hadir', grades: { technique: 'A' }, notes: '=HYPERLINK("test")', updatedAt: new Date().toISOString() };
test('attendance is independent from grades and absence does not become D', () => {
  assert.equal(model.isComplete(meeting, undefined), false);
  assert.equal(model.isComplete(meeting, { ...record, grades: {} }), false);
  assert.equal(model.isComplete(meeting, record), true);
  assert.equal(model.isComplete(meeting, { ...record, attendance: 'sakit', grades: {} }), true);
});
test('reports count only meetings for the student class and retain unmarked attendance', () => {
  const meetings = [meeting, { ...meeting, id: 'm2' }, { ...meeting, id: 'm3', className: '7B' }];
  const records = { [model.recordKey('m1','7a-01')]: record };
  const rows = model.reportRows(meetings, records);
  assert.equal(rows.length, 27);
  const first = rows.find(r => r.student.id === '7a-01');
  assert.equal(first.entries.length, 2);
  assert.deepEqual(first.counts, { hadir: 1, izin: 0, sakit: 0, alpa: 0, unmarked: 1 });
  assert.equal(rows.find(r => r.student.id === '7b-01').entries.length, 1);
});
test('storage rejects grades for absent students, wrong class, and incomplete rubrics', () => {
  const valid = { meetings: [meeting], records: { [model.recordKey('m1','7a-01')]: record } };
  assert.deepEqual(model.parseSessions(JSON.stringify(valid)), valid);
  for (const badRecord of [{ ...record, attendance: 'alpa' }, { ...record, grades: {} }, { ...record, grades: { technique: 'Z' } }]) {
    assert.throws(() => model.parseSessions(JSON.stringify({ meetings: [meeting], records: { 'm1|7a-01': badRecord } })));
  }
  assert.throws(() => model.parseSessions(JSON.stringify({ meetings: [meeting], records: { 'm1|7b-01': record } })));
});
test('CSV includes per-student attendance, rubric grades, notes, and escapes formulas', () => {
  const csv = model.reportCsv([meeting], { 'm1|7a-01': record });
  assert.ok(csv.includes('Aini Rayhana Anwar'));
  assert.ok(csv.includes('Kontrol napas'));
  assert.ok(csv.includes('Hadir'));
  assert.ok(csv.includes('Belum dicatat'));
  assert.ok(csv.includes("'=HYPERLINK"));
  assert.equal(model.csvCell('a,"b"'), '"a,""b"""');
});

test('existing A–D meetings retain their grades and descriptors when E is introduced', () => {
  const old = structuredClone(meeting);
  delete old.rubric[0].descriptors.E;
  const data = model.parseSessions(JSON.stringify({ meetings: [old], records: { 'm1|7a-01': { ...record, grades: { technique: 'D' } } } }));
  assert.equal(data.meetings[0].rubric[0].descriptors.D, 'Perlu pendampingan');
  assert.equal(data.meetings[0].rubric[0].descriptors.E, model.GENERAL_DESCRIPTORS.E);
  assert.equal(data.records['m1|7a-01'].grades.technique, 'D');
});
test('grade E and optional empty notes persist and appear in generated reports', () => {
  const data = { meetings: [meeting], records: { 'm1|7a-01': { ...record, grades: { technique: 'E' }, notes: '' } } };
  assert.deepEqual(model.parseSessions(JSON.stringify(data)), data);
  assert.ok(model.reportCsv(data.meetings, data.records).includes('Pendampingan intensif'));
});

test('server input validation strips forged actor fields and rejects invalid attendance/grade combinations', () => {
  const { loginSchema, meetingSchema, recordSchema } = load('src/lib/portal-validation.ts');
  assert.equal(loginSchema.safeParse({ username: "bad' OR 1=1", password: 'x', target: 'admin' }).success, false);
  const parsed = meetingSchema.parse({ id: '10000000-0000-4000-8000-000000000001', coachId: 'forged', eskul: 'renang', className: '7A', title: 'Latihan', date: '2026-10-17', period: '2026-2027-1', skill: 'Napas' });
  assert.equal('coachId' in parsed, false);
  const base = { meetingId: parsed.id, studentId: '7a-01', notes: '' };
  assert.equal(recordSchema.safeParse({ ...base, attendance: 'hadir', grade: 'E' }).success, true);
  assert.equal(recordSchema.safeParse({ ...base, attendance: 'hadir', grade: null }).success, false);
  assert.equal(recordSchema.safeParse({ ...base, attendance: 'sakit', grade: 'A' }).success, false);
  assert.equal(recordSchema.safeParse({ ...base, attendance: 'sakit', grade: null }).success, true);
});
