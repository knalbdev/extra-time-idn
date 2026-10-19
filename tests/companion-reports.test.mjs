import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import ts from 'typescript';
const external=createRequire(import.meta.url),cache=new Map();
function load(file){
  const full=path.resolve(file);if(cache.has(full))return cache.get(full);
  const code=ts.transpileModule(fs.readFileSync(full,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
  const mod={exports:{}};new Function('exports','module','require',code)(mod.exports,mod,id=>id.startsWith('.')?load(path.resolve(path.dirname(full),id+'.ts')):external(id));cache.set(full,mod.exports);return mod.exports;
}
const {COMPANION_NAMES,isDocumentationLink,companionSubmissionSchema,reportableSessions}=load('src/lib/companions.ts');
const ids={admin:'00000000-0000-4000-8000-000000000001',coach:'00000000-0000-4000-8000-000000000002',shared:'00000000-0000-4000-8000-000000000004'};
const reportId='20000000-0000-4000-8000-000000000001';
test('all 12 supplied names are preserved, and forged actors/snapshots are stripped',()=>{
  assert.equal(COMPANION_NAMES.length,12);assert.equal(new Set(COMPANION_NAMES).size,12);
  assert.equal(COMPANION_NAMES[8],'Annida Mar’athus Shaleha');
  const form={id:reportId,name:COMPANION_NAMES[0],sessionId:'berkuda-2026-10-10',notes:'  Lancar  ',driveUrl:' https://drive.google.com/drive/folders/test-file?usp=sharing '};
  for(const name of COMPANION_NAMES)assert.ok(companionSubmissionSchema.safeParse({...form,name}).success);
  const parsed=companionSubmissionSchema.parse({...form,actor_id:ids.admin,classes:['11 DKV'],date:'2030-01-01',eskul:'pramuka'});
  assert.equal(parsed.notes,'Lancar');assert.equal(parsed.driveUrl.trim(),parsed.driveUrl);
  assert.equal('actor_id' in parsed,false);assert.equal('classes' in parsed,false);
  assert.equal(companionSubmissionSchema.parse({...form,name:'  Guru   Pendamping Tambahan  '}).name,'Guru Pendamping Tambahan');
  for(const name of ['', 'A', ' '.repeat(5), '<script>Guru</script>', 'Guru\nBaru', 'x'.repeat(121)])assert.equal(companionSubmissionSchema.safeParse({...form,name}).success,false);
  assert.equal(companionSubmissionSchema.safeParse({...form,notes:'x'.repeat(2001)}).success,false);
  assert.deepEqual(reportableSessions(['selesai','terjadwal','belum','libur','ditiadakan'].map(statusNormalized=>({statusNormalized,classes:['7A']}))).map(e=>e.statusNormalized),['selesai','terjadwal','belum']);
});
test('documentation links allow Google Drive resources and reject scripts, credentials and lookalike hosts',()=>{
  for(const value of ['https://drive.google.com/drive/folders/folder_123?usp=sharing','https://drive.google.com/drive/u/0/folders/folder_123','https://drive.google.com/file/d/file-123/view','https://drive.google.com/open?id=file_123','https://docs.google.com/document/d/file_123/edit','https://docs.google.com/presentation/d/file_123/edit'])assert.ok(isDocumentationLink(value),value);
  for(const value of ['javascript:alert(1)','http://drive.google.com/file/d/file/view','https://drive.google.com.evil.example/file/d/test','https://drive.google.com@evil.example/file/d/test','https://user:password@drive.google.com/file/d/test','https://drive.google.com:8443/file/d/test','https://drive.google.com/drive/my-drive','https://example.com/folder'])assert.equal(isDocumentationLink(value),false,value);
});

test('real PostgreSQL policies keep shared reports private, enforce roles, preserve snapshots and make retries idempotent',async()=>{
  const {PGlite}=await import(process.env.PGLITE_MODULE||'@electric-sql/pglite');const db=new PGlite();
  try {
    await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;
      create table auth.users(id uuid primary key,email_confirmed_at timestamptz);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid;$$;
      grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`);
    for(const file of ['202610170001_initial_portal.sql','202610170002_seed_students.sql','202610170003_portal_runtime.sql','202610180004_extracurricular_visibility.sql','202610190005_companion_reports.sql'])await db.exec(fs.readFileSync(`supabase/migrations/${file}`,'utf8'));
    for(const [role,id] of Object.entries(ids)){
      await db.query('insert into auth.users values($1,now())',[id]);
      await db.query('insert into public.profiles(id,username,role,display_name) values($1,$2,$3,$2)',[id,role,role==='shared'?'pendamping':role]);
    }
    const as=async(role,id='')=>{await db.exec(`reset role;set role ${role};`);await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);};
    const args=[ids.shared,reportId,COMPANION_NAMES[0],'berkuda-2026-10-10','test-sheet','berkuda','2026-10-10','14.00 - 17.00',['7A','7B'],'Tidak ada transportasi.','https://drive.google.com/drive/folders/test'];
    const submit=values=>db.query('select public.submit_companion_report($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) as id',values);
    await as('service_role');assert.equal((await submit(args)).rows[0].id,reportId);await submit(args);
    const hash=value=>createHash('sha256').update(value).digest('hex');
    for(const [username,limit] of [['shared',30],['coach',10]]){
      for(let i=0;i<limit;i++)assert.equal((await db.query('select public.consume_portal_login($1,$2) as allowed',[hash(username),hash('client-'+username)])).rows[0].allowed,true);
      assert.equal((await db.query('select public.consume_portal_login($1,$2) as allowed',[hash(username),hash('client-'+username)])).rows[0].allowed,false);
    }
    assert.equal((await db.query('select count(*) as n from public.companion_reports')).rows[0].n,1);
    await assert.rejects(submit(args.map((value,i)=>i===9?'Changed content':value)),/Submission ID conflict/);
    await assert.rejects(submit(args.map((value,i)=>i===0?ids.coach:value)),/Companion required/);
    await assert.rejects(submit(args.map((value,i)=>i===5?'pramuka':value)),/Active extracurricular required/);
    await assert.rejects(submit(args.map((value,i)=>i===2?'Unknown name':value)));
    await assert.rejects(submit(args.map((value,i)=>i===8?['99Z']:value)));
    await as('postgres');
    await db.exec(fs.readFileSync('supabase/migrations/202610190006_companion_reminders.sql','utf8'));
    const start=(await db.query("select starts_on::text as d from app_private.companion_reminder_settings")).rows[0].d;
    assert.equal(start,new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()));
    await db.exec("update app_private.companion_reminder_settings set starts_on='2026-01-01'");
    await as('service_role');
    const manualId='20000000-0000-4000-8000-000000000002';
    await submit(args.map((value,i)=>i===1?manualId:i===2?'Guru Pendamping Tambahan':value));
    for(const invalid of ['A',' '.repeat(5),'<script>Guru</script>','x'.repeat(121)])await assert.rejects(submit(args.map((value,i)=>i===2?invalid:value)));
    await as('authenticated',ids.shared);
    const state=(await db.query('select public.get_companion_reporting_state() as state')).rows[0].state;
    assert.equal(state.startsOn,'2026-01-01');assert.ok(Number.isFinite(Date.parse(state.checkedAt)));
    assert.equal(state.completed.length,1,'duplicate reports for the same snapshot are collapsed');
    assert.deepEqual(Object.keys(state.completed[0]).sort(),['activity_date','activity_time','class_ids','extracurricular_id','source_spreadsheet']);
    assert.equal(JSON.stringify(state).includes('Guru Pendamping'),false);assert.equal(JSON.stringify(state).includes('drive.google'),false);
    await assert.rejects(db.query('select * from app_private.companion_reminder_settings'));
    await as('authenticated',ids.coach);await assert.rejects(db.query('select public.get_companion_reporting_state()'));
    await as('postgres');await db.query('update public.profiles set is_active=false where id=$1',[ids.shared]);
    await as('authenticated',ids.shared);await assert.rejects(db.query('select public.get_companion_reporting_state()'));
    await as('postgres');await db.query('update public.profiles set is_active=true where id=$1',[ids.shared]);
    await as('anon');await assert.rejects(db.query('select public.get_companion_reporting_state()'));await assert.rejects(db.query('select * from public.companion_reports'));
    await assert.rejects(submit(args));
    for(const actor of [ids.coach,ids.shared]){
      await as('authenticated',actor);
      assert.equal((await db.query('select * from public.companion_reports')).rows.length,0);
      assert.equal((await db.query("update public.companion_reports set notes='forged' returning id")).rows.length,0);
      assert.equal((await db.query('delete from public.companion_reports returning id')).rows.length,0);
      await assert.rejects(submit(args));
      await assert.rejects(db.query('insert into public.companion_reports(id) values($1)',[reportId]));
    }
    await as('authenticated',ids.shared);
    assert.equal((await db.query('select * from public.students')).rows.length,0);
    assert.equal((await db.query('select * from public.meeting_records')).rows.length,0);
    await as('authenticated',ids.admin);
    assert.equal((await db.query('select * from public.companion_reports')).rows.length,2);
    await db.query('update public.companion_reports set companion_name=$1,notes=$2 where id=$3',[COMPANION_NAMES[8],'Koreksi admin',reportId]);
    const corrected=(await db.query('select * from public.companion_reports where id=$1',[reportId])).rows[0];
    assert.equal(corrected.updated_by,ids.admin);assert.equal(corrected.notes,'Koreksi admin');assert.deepEqual(corrected.class_ids,['7A','7B']);
    await assert.rejects(db.query("update public.companion_reports set activity_date='2030-01-01'"));
    await assert.rejects(db.query("update public.companion_reports set drive_url='javascript:alert(1)'"));
    assert.equal((await db.query('delete from public.companion_reports returning id')).rows.length,2);
  } finally {await db.close();}
});

const {sessionStartMinutes,reminderDueAt,sessionReportKey,pendingCompanionSessions,unclockedCompanionSessions}=load('src/lib/companion-reminders.ts');
const session=(id,overrides={})=>({id,eskul:'renang',eskulLabel:'Renang',date:'2026-10-19',time:'09.00 - 11.00',classes:['7A'],statusNormalized:'terjadwal',...overrides});
const reporting={startsOn:'2026-10-19',checkedAt:'2026-10-19T02:59:59Z',completed:[]};
test('reminders use the exact one-hour WIB boundary, carry over, and skip old, future, canceled and duplicate sessions',()=>{
  const event=session('current');
  assert.equal(reminderDueAt(event),Date.parse('2026-10-19T10:00:00+07:00'));
  assert.deepEqual(pendingCompanionSessions([event],reporting,'sheet',Date.parse('2026-10-19T09:59:59+07:00')),[]);
  assert.deepEqual(pendingCompanionSessions([event],reporting,'sheet',Date.parse('2026-10-19T10:00:00+07:00')).map(e=>e.id),['current']);
  const events=[event,session('same',{classes:['7A']}),session('old',{date:'2026-10-18'}),session('future',{date:'2026-10-21'}),session('canceled',{statusNormalized:'ditiadakan'}),session('holiday',{statusNormalized:'libur'}),session('empty',{classes:[]}),session('next-slot',{time:'13.00 - 14.30'}),session('next-class',{classes:['7B']})];
  assert.deepEqual(pendingCompanionSessions(events,reporting,'sheet',Date.parse('2026-10-20T01:00:00+07:00')).map(e=>e.id),['current','next-class','next-slot']);
  assert.equal(reminderDueAt(session('late',{time:'23.30 - 00.30'})),Date.parse('2026-10-20T00:30:00+07:00'));
});
test('completion matching survives reordered sheet rows, class order and estimated end times without merging separate slots',()=>{
  const event=session('new-row',{classes:['7A','7B']});
  const state={...reporting,completed:[{source_spreadsheet:'sheet',extracurricular_id:'renang',activity_date:'2026-10-19',activity_time:'09:00 - 10:30',class_ids:['7B','7A']}]};
  assert.equal(sessionReportKey('renang',event.date,event.time,event.classes),sessionReportKey('renang',event.date,'09:00 - 10:30',['7B','7A']));
  const now=Date.parse('2026-10-19T17:00:00+07:00');
  assert.equal(pendingCompanionSessions([event],state,'sheet',now).length,0);
  assert.equal(pendingCompanionSessions([event],state,'another-sheet',now).length,1);
  assert.equal(pendingCompanionSessions([session('second',{time:'13:00',classes:['7A','7B']})],state,'sheet',now).length,1);
  assert.equal(pendingCompanionSessions([session('changed-class',{classes:['7A']})],state,'sheet',now).length,1);
});
test('missing or invalid start clocks are flagged for correction without inventing one-hour deadlines',()=>{
  for(const time of ["Ba'da Ashar",'Selesai 11.00','24.00','09.75','—'])assert.equal(sessionStartMinutes(time),null,time);
  for(const time of ['09.00 - 11.00','09:00','09,00','Pukul 09.00'])assert.equal(sessionStartMinutes(time),540,time);
  const events=[session('unknown',{time:"Ba'da Ashar"}),session('valid'),session('canceled',{time:'—',statusNormalized:'libur'}),session('tomorrow',{date:'2026-10-20',time:'—'})];
  assert.deepEqual(unclockedCompanionSessions(events,reporting,'sheet','2026-10-19').map(e=>e.id),['unknown']);
});
