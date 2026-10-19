import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import ts from 'typescript';

const external=createRequire(import.meta.url),cache=new Map();
function load(file) {
  const full=path.resolve(file);
  if(cache.has(full))return cache.get(full);
  const code=ts.transpileModule(fs.readFileSync(full,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const mod={exports:{}};
  new Function('exports','module','require',code)(mod.exports,mod,id=>id.startsWith('.')?load(path.resolve(path.dirname(full),id+'.ts')):external(id));
  cache.set(full,mod.exports);return mod.exports;
}
const {calendarMonthWeeks,shiftCalendarMonth}=load('src/lib/calendar.ts');
const {isoToday,formatLongIndo}=load('src/lib/format.ts');

test('month cells place October 2026 dates under their actual weekdays, including four-session Saturdays',()=>{
  const weeks=calendarMonthWeeks('2026-10');
  assert.equal(weeks.length,6);
  assert.deepEqual(weeks[0],['2026-09-28','2026-09-29','2026-09-30','2026-10-01','2026-10-02','2026-10-03','2026-10-04']);
  assert.equal(weeks[3][5],'2026-10-24');
  assert.equal(formatLongIndo('2026-10-24'),'Sabtu, 24 Oktober 2026');
  assert.equal(new Set(weeks.flat()).size,42);
});
test('leap days, year changes and DST months keep consecutive calendar dates',()=>{
  assert.equal(calendarMonthWeeks('2028-02').flat().filter(date=>date.startsWith('2028-02')).length,29);
  assert.equal(calendarMonthWeeks('2027-02').flat().filter(date=>date.startsWith('2027-02')).length,28);
  assert.equal(shiftCalendarMonth('2026-12',1),'2027-01');
  assert.equal(shiftCalendarMonth('2027-01',-1),'2026-12');
  for(const month of ['2026-03','2026-11','2028-02']){
    const days=calendarMonthWeeks(month).flat();
    for(let i=1;i<days.length;i++)assert.equal(Date.parse(days[i])-Date.parse(days[i-1]),86400000);
  }
});
test('today follows midnight in Jakarta rather than the device timezone',()=>{
  assert.equal(isoToday(new Date('2026-10-19T16:59:59Z')),'2026-10-19');
  assert.equal(isoToday(new Date('2026-10-19T17:00:00Z')),'2026-10-20');
  assert.equal(isoToday(new Date('2026-12-31T17:00:00Z')),'2027-01-01');
});
