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
  const source = ts.transpileModule(fs.readFileSync(full, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
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

test('one meeting slide contains the whole class; full long notes remain in referenced appendices', () => {
  const { buildReportSlides, splitReportNote, gradeDescription } = load('src/lib/report-slides.ts');
  const longNote = ('Arahan latihan berikutnya: fokus pernapasan.\n\n' + 'Kemajuan '.repeat(25)).repeat(7).slice(0, 2000);
  assert.equal(splitReportNote(longNote).join(''), longNote);
  const records = { 'm1|7a-01': { ...record, notes: longNote } };
  const slides = buildReportSlides([meeting], records, students);
  assert.deepEqual(slides.slice(0, 2).map(s => s.kind), ['cover', 'overview']);
  const summary = slides.filter(s => s.kind === 'summary');
  assert.equal(summary.length, 1);
  assert.equal(summary[0].rows.length, 13);
  const detail = slides.filter(s => s.kind === 'meeting');
  assert.equal(detail.length, 1);
  assert.equal(detail[0].rows.length, 13);
  assert.equal(new Set(detail[0].rows.map(r => r.student.id)).size, 13);
  assert.ok(detail[0].rows.every(r => r.student.className === '7A'));
  assert.equal(detail[0].rows[0].description, 'Mandiri', 'Custom rubric descriptions must retain their meaning');
  assert.ok(detail[0].rows[0].notes.includes('(L1)'));
  const appendix = slides.filter(s => s.kind === 'notes' && s.reference === 'L1');
  assert.equal(appendix.map(s => s.text).join(''), longNote);
  assert.equal(gradeDescription(meeting, {...record, attendance:'sakit', grades:{}}), 'Tidak dinilai karena tidak hadir.');
});

test('export layout fits all 16 students on one editable meeting slide with grade descriptions', () => {
  const { createExportPages } = load('src/lib/report-export.ts');
  const { jsPDF } = loadExternal('jspdf');
  const { GENERAL_DESCRIPTORS } = rawModel;
  const roster = students.filter(s => s.className === '11 DKV');
  assert.equal(roster.length, 16);
  const m = { ...meeting, className:'11 DKV', title:'Latihan pernapasan dan penguasaan keterampilan dasar '.repeat(2).slice(0,120), skill:'Keterampilan inti yang menjadi dasar pembelajaran dan pengembangan kemampuan siswi '.repeat(2).slice(0,160), rubric:[{id:'skill',title:'Pernapasan',descriptors:GENERAL_DESCRIPTORS}] };
  const records = Object.fromEntries(roster.map(s => [rawModel.recordKey(m.id,s.id), {...record, grades:{skill:'E'}, notes:'Latihan dilakukan secara bertahap dengan pendampingan rutin.'}]));
  const report = {meetings:[m], records, generatedAt:'2026-10-18T12:00:00Z'};
  const pages = createExportPages(report,roster,'Renang',new jsPDF({unit:'pt'}));
  const detail = pages.filter(p => p.kind === 'meeting');
  assert.equal(detail.length, 1);
  assert.ok(detail[0].tableBottom <= 501);
  assert.ok(detail[0].tableFontSize >= 7.4);
  const text = detail[0].items.filter(i => i.kind === 'text').map(i => i.text.replaceAll('\n',' '));
  for (const student of roster) assert.ok(text.includes(student.name), student.name);
  assert.ok(text.some(value => value.includes('pendampingan intensif')));
  for (const page of pages) for (const item of page.items) {
    assert.ok(item.x >= 0 && item.y >= 0 && item.x+item.w <= 961 && item.y+item.h <= 541, JSON.stringify(item));
  }
});

test('spreadsheet recap uses exact completed status and inclusive dates, counting sessions rather than classes', () => {
  const {buildSessionRecap,validRecapRange}=load('src/lib/session-recap.ts');
  const event={id:'one',eskul:'renang',eskulLabel:'Renang',date:'2026-10-01',dateLabel:'1 Okt 2026',time:'10.00',classes:['7A','7B'],weekNo:'1',status:'Sudah Terlaksana',statusNormalized:'selesai'};
  const events=[event,{...event,id:'end',date:'2026-10-31'}, {...event,id:'early',date:'2026-09-30'}, {...event,id:'late',date:'2026-11-01'}, {...event,id:'pending',status:'Belum Terlaksana',statusNormalized:'belum'}, {...event,id:'cancel',status:'Sudah dibatalkan'}, {...event,id:'arrow1',eskul:'panahan',status:'  SUDAH  Terlaksana  '}, {...event,id:'arrow2',eskul:'panahan',time:'13.00'}];
  const recap=buildSessionRecap(events,'2026-10-01','2026-10-31','all','2026-10-18T09:00:00Z');
  assert.equal(recap.total,4);
  assert.equal(recap.days,2);
  assert.equal(recap.activeEskuls,2);
  assert.equal(recap.rows.find(row=>row.eskul==='renang').count,2);
  assert.equal(recap.rows.find(row=>row.eskul==='panahan').count,2);
  assert.equal(recap.rows.find(row=>row.eskul==='pramuka').count,0);
  assert.equal(recap.rows.find(row=>row.eskul==='renang').lastDate,'2026-10-31');
  assert.equal(buildSessionRecap(events,'2026-10-01','2026-10-01','panahan','now').total,2);
  assert.equal(buildSessionRecap(events,'2026-12-01','2026-12-31','all','now').total,0);
  assert.equal(validRecapRange('2026-10-31','2026-10-01'),false);
  assert.equal(validRecapRange('2026-02-30','2026-03-01'),false);
  assert.equal(validRecapRange('','2026-10-01'),false);
  assert.throws(()=>buildSessionRecap(events,'2026-10-31','2026-10-01','all','now'));
});

test('schedule reads Status Pelaksanaan by header, including separate Panahan sessions and blank statuses', async () => {
  const { getAllEvents } = load('src/lib/sheets.ts');
  const sheets = {
    Renang: 'Pekan,Tanggal,Kelas,Guru,Status,Hasil,Catatan, Status Pelaksanaan \n1,13 Okt 2026,9A,Coach,Libur,,,Sudah Terlaksana\n2,14 Okt 2026,7A,Coach,Sudah Terlaksana,,,',
    Panahan: 'Pekan,Tanggal,Kelas1,Jam1,Guru1,Status1,Kelas2,Jam2,Guru2,Status2,Hasil,Catatan,Status Pelaksanaan 1,Status Pelaksanaan 2\n1,15 Okt 2026,7A,10.00,Coach,Libur,7B,13.00,Coach,Sudah Terlaksana,,,Belum Terlaksana,Libur',
    Berkuda: 'Pekan,Semester,Tanggal,Jenjang,Kelas,Status,Hasil,Catatan,Status Pelaksanaan\n1,1,18 Okt 2026,SMP,8A,Sudah Terlaksana,,,Libur',
    Taekwondo: 'Pekan,Semester,Tanggal,Jenjang,Kelas,Status,Hasil,Catatan,Status Pelaksanaan\n1,1,18 Okt 2026,SMP,7A,Sudah Terlaksana,,,Sudah dibatalkan',
    Pramuka: 'Pekan,Tanggal,Kelas,Status,Hasil,Catatan,Status Pelaksanaan\n1,18 Okt 2026,SMP,Sudah Terlaksana,,,Menunggu konfirmasi',
  };
  const original = globalThis.fetch;
  globalThis.fetch = async url => new Response(sheets[new URL(url).searchParams.get('sheet')]);
  try {
    const events = await getAllEvents();
    assert.deepEqual(events.filter(e => e.eskul === 'renang').map(e => [e.status, e.statusNormalized]), [['Sudah Terlaksana', 'selesai'], ['', 'terjadwal']]);
    assert.deepEqual(events.filter(e => e.eskul === 'panahan').map(e => [e.status, e.statusNormalized]), [['Belum Terlaksana', 'belum'], ['Libur', 'libur']]);
    assert.equal(events.find(e => e.eskul === 'berkuda').statusNormalized, 'libur');
    assert.equal(events.find(e => e.eskul === 'taekwondo').statusNormalized, 'ditiadakan', 'Sudah dibatalkan must never become completed');
    assert.equal(events.find(e => e.eskul === 'pramuka').status, 'Menunggu konfirmasi', 'Keep the original label for statuses outside the common list');
  } finally { globalThis.fetch = original; }
});

test('revised spreadsheet preserves history, replacement sessions, combined trips, exact scopes and actual status', async () => {
  const { getAllEvents } = load('src/lib/sheets.ts');
  const original = globalThis.fetch;
  const requested = [];
  globalThis.fetch = async url => {
    const name = new URL(url).searchParams.get('sheet'); requested.push(name);
    return new Response(fs.readFileSync(`tests/fixtures/sheets-revised-2026-10/${name}.csv`, 'utf8'));
  };
  try {
    const events = await getAllEvents();
    assert.equal(events.length, 161);
    assert.equal(new Set(events.map(event => event.id)).size, 161);
    assert.deepEqual(Object.fromEntries(['renang','panahan','berkuda','taekwondo','pramuka'].map(key => [key, events.filter(event => event.eskul === key).length])), {renang:46,panahan:50,berkuda:31,taekwondo:13,pramuka:21});
    const replacements = events.filter(event => event.eskul === 'panahan' && event.weekNo.startsWith('M'));
    assert.equal(replacements.length, 4);
    assert.ok(replacements.every(event => event.time === '11.30 - 12.30'));
    assert.equal(events.filter(event => event.eskul === 'panahan' && event.date === '2026-10-24').length, 3);
    const tk = events.filter(event => event.eskul === 'taekwondo');
    assert.ok(tk.filter(event => event.weekNo.startsWith('R')).every(event => event.time === '11.30 - 13.30'));
    assert.ok(tk.filter(event => !event.weekNo.startsWith('R')).every(event => event.time === '09.00 - 11.00'));
    assert.equal(tk.find(event => event.weekNo === 'R01').classes.length, 6);
    assert.equal(tk.find(event => event.weekNo === 'R02').classes.length, 4);
    assert.equal(events.find(event => event.eskul === 'pramuka').classes.length, 10);
    const riding = events.filter(event => event.eskul === 'berkuda' && event.date === '2026-10-31');
    assert.equal(riding.length, 1);
    assert.deepEqual(riding[0].classes, ['10 RPL','10 DKV','11 RPL','11 DKV']);
    assert.equal(events.filter(event => event.eskul === 'berkuda' && event.date < '2026-10-10').length, 5, 'Retain canceled Sunday history');
    assert.ok(events.filter(event => event.date > '2026-10-18').every(event => event.status === '' && event.statusNormalized === 'terjadwal'), 'Ignore misleading Status Jadwal=Selesai for future Panahan plans');
    assert.equal(events.at(-1).date, '2027-06-29');
    assert.ok(events.find(event => event.eskul === 'renang' && event.date === '2026-08-04').teacher);
    assert.ok(events.find(event => event.eskul === 'renang' && event.date === '2027-06-29').notes.includes('validasi'));
    assert.equal(requested.length, 6);
    const active = await getAllEvents(['renang','panahan','berkuda','taekwondo']);
    assert.equal(active.length, 140);
    assert.ok(!active.some(event => event.eskul === 'pramuka'));
  } finally { globalThis.fetch = original; }
});

test('current workbook reads one row per session and agrees with every Jadwal Induk entry', async () => {
  const { getAllEvents } = load('src/lib/sheets.ts');
  const { SPREADSHEET_ID } = load('src/lib/constants.ts');
  const Papa = loadExternal('papaparse');
  const original = globalThis.fetch;
  const requested = [];
  globalThis.fetch = async url => {
    const source = new URL(url);
    assert.ok(source.pathname.includes(SPREADSHEET_ID));
    const name = source.searchParams.get('sheet'); requested.push(name);
    return new Response(fs.readFileSync(`tests/fixtures/sheets-current-2026-10/${name}.csv`, 'utf8'));
  };
  try {
    const events = await getAllEvents();
    assert.equal(events.length, 149);
    assert.equal(new Set(events.map(e => e.id)).size, 149);
    const counts = Object.fromEntries(['renang','panahan','berkuda','taekwondo','pramuka'].map(key => [key, events.filter(e => e.eskul === key).length]));
    assert.deepEqual(counts, {renang:46,panahan:50,berkuda:26,taekwondo:13,pramuka:14});
    const master = Papa.parse(fs.readFileSync('tests/fixtures/sheets-current-2026-10/Jadwal Induk.csv','utf8'), {skipEmptyLines:'greedy'}).data.slice(1);
    const snapshot = events.map(e => `${e.eskulLabel}|${e.dateLabel}|${e.time}|${e.classes.join(', ')}|${e.status}`).sort();
    assert.deepEqual(snapshot, master.map(r => `${r[6]}|${r[2]}|${r[4].replace(':','.')} - ${r[5].replace(':','.')}|${r[8]}|${r[9]}`).sort());
    assert.equal(events.filter(e => e.status === 'Sudah Terlaksana').length, 21);
    assert.ok(events.every(e => e.teacher === undefined && e.result === undefined && e.weekNo === ''), 'Do not misread other fields as teachers, results or weeks');
    assert.equal(events.find(e => e.eskul === 'taekwondo' && e.date === '2026-11-07').time, '09.00 - 11.00');
    const riding = events.find(e => e.eskul === 'berkuda' && e.date === '2026-10-31');
    assert.deepEqual(riding.classes, ['9A','9B']);
    assert.equal(riding.time, '14.00 - 17.00');
    assert.ok(events.find(e => e.eskul === 'pramuka').classes.length === 10);
    assert.ok(events.filter(e => e.date > '2026-10-18').every(e => e.status === 'Terjadwal'));
    assert.ok(!requested.includes('Jadwal Gabungan'));
    assert.equal((await getAllEvents(['renang','panahan','berkuda','taekwondo'])).length, 135);
    // Reordering rows does not change a session's identity.
    globalThis.fetch = async url => {
      const name = new URL(url).searchParams.get('sheet');
      const rows = Papa.parse(fs.readFileSync(`tests/fixtures/sheets-current-2026-10/${name}.csv`,'utf8'), {skipEmptyLines:'greedy'}).data;
      return new Response(Papa.unparse([rows[0], ...rows.slice(1).reverse()]));
    };
    assert.deepEqual((await getAllEvents()).map(e => e.id).sort(), events.map(e => e.id).sort());
  } finally { globalThis.fetch = original; }
});

test('CSV failures are explicit and empty schedules remain empty', async () => {
  const { getAllEvents } = load('src/lib/sheets.ts');
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response('Header\n');
    assert.deepEqual(await getAllEvents(['renang']), []);
    globalThis.fetch = async () => new Response('<html>Sign in</html>', {headers:{'content-type':'text/html'}});
    await assert.rejects(getAllEvents(['renang']), /Jadwal Renang belum dapat dimuat/);
    globalThis.fetch = async () => new Response('Judul\nKolom yang berubah\nData lainnya');
    await assert.rejects(getAllEvents(['renang']), /Jadwal Renang belum dapat dimuat/);
    globalThis.fetch = () => { throw Error('Must not fetch paused activities'); };
    assert.deepEqual(await getAllEvents([]), []);
  } finally { globalThis.fetch = original; }
});
