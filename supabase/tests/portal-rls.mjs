// Standalone PostgreSQL-compatible validation without connecting to real Supabase.
// PGLITE_MODULE can point to a temporary installation, keeping app dependencies unchanged.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
await db.exec(`
  create role anon; create role authenticated; create role service_role bypassrls;
  create schema auth;
  create table auth.users(id uuid primary key, email_confirmed_at timestamptz);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
  $$;
  grant usage on schema auth to authenticated;
  grant execute on function auth.uid() to authenticated;
`);
for (const file of ['202610170001_initial_portal.sql','202610170002_seed_students.sql','202610170003_portal_runtime.sql','202610180004_extracurricular_visibility.sql']) {
  await db.exec(await fs.readFile(new URL(`../migrations/${file}`, import.meta.url), 'utf8'));
}
const admin='00000000-0000-0000-0000-000000000001';
const coach='00000000-0000-0000-0000-000000000002';
const other='00000000-0000-0000-0000-000000000003';
const companion='00000000-0000-0000-0000-000000000004';
const meeting='10000000-0000-0000-0000-000000000001';
await db.exec(`insert into auth.users values ('${admin}', now()),('${coach}', now()),('${other}', now()),('${companion}', now());
insert into public.profiles(id,username,role,display_name) values
('${admin}','admin','admin','Admin'),('${coach}','coach.renang','coach','Coach Renang'),
('${other}','coach.panahan','coach','Coach Panahan'),('${companion}','pendamping','pendamping','Pendamping');
insert into public.assignments values ('${coach}','renang','7A'),('${other}','panahan','7B'),('${companion}','renang','7A');`);
async function actor(id) {
  await db.exec(`reset role; set role authenticated; set request.jwt.claim.sub = '${id}';`);
}
async function count(table) { return Number((await db.query(`select count(*) as n from public.${table}`)).rows[0].n); }
async function denied(sql) { await assert.rejects(db.exec(sql)); }
await db.exec('set role anon');
await denied('select * from public.students');
assert.deepEqual((await db.query('select public.get_enabled_extracurriculars() as id')).rows.map(row=>row.id), ['berkuda','panahan','renang','taekwondo']);
await denied("update public.extracurriculars set is_active=true where id='pramuka'");
await db.exec('reset role');
await actor(admin);
assert.equal(await count('students'),137);
assert.equal(await count('profiles'),4);
await actor(coach);
await denied(`select public.update_coach_assignment('${other}',true,array['renang'],array['7A'])`);
await denied(`select public.consume_portal_login(repeat('a',64),repeat('b',64))`);
assert.equal(await count('students'),13);
assert.equal(await count('profiles'),1);
assert.equal(await count('extracurriculars'),1);
assert.equal(await count('classes'),1);
await denied(`insert into public.profiles(id,username,role,display_name) values (gen_random_uuid(),'hacker','admin','Hacker')`);
await db.exec(`update public.profiles set role='admin' where id='${coach}'`);
assert.equal((await db.query(`select role from public.profiles where id='${coach}'`)).rows[0].role,'coach');
await db.exec(`insert into public.meetings(id,coach_id,extracurricular_id,class_id,title,meeting_date,period,skill)
values ('${meeting}','${coach}','renang','7A','Pertemuan 1','2026-10-17','2026-2027-1','Pernapasan') returning id`);
await denied(`insert into public.meetings(coach_id,extracurricular_id,class_id,title,meeting_date,period,skill)
values ('${coach}','panahan','7A','Salah ekskul','2026-10-17','2026-2027-1','Panahan')`);
await db.exec(`insert into public.meeting_records(meeting_id,student_id,class_id,attendance,grade)
values ('${meeting}','7a-01','7A','hadir','E')`);
await denied(`insert into public.meeting_records(meeting_id,student_id,class_id,attendance,grade)
values ('${meeting}','7a-02','7A','sakit','E')`);
await denied(`insert into public.meeting_records(meeting_id,student_id,class_id,attendance,grade)
values ('${meeting}','7b-01','7A','hadir','A')`);
await db.exec(`insert into public.meeting_records(meeting_id,student_id,class_id,attendance,grade)
values ('${meeting}','7a-02','7A','sakit',null)`);
await denied(`update public.meetings set skill='Mengganti arti nilai' where id='${meeting}'`);
await db.exec(`update public.meeting_records set notes='Latihan lanjutan', updated_by='${admin}' where meeting_id='${meeting}' and student_id='7a-01'`);
assert.equal((await db.query('select updated_by from public.meeting_records limit 1')).rows[0].updated_by,coach);
// A shared pause blocks an already-authenticated coach and preserves historical data.
await db.exec("update public.extracurriculars set is_active=false where id='renang'");
assert.equal((await db.query("select is_active from public.extracurriculars where id='renang'")).rows[0].is_active,true,'Coach cannot change activity status');
await actor(admin);
await db.exec("update public.extracurriculars set is_active=false where id='renang'");
assert.equal(await count('meeting_records'),2,'Admin retains historical records while paused');
assert.equal((await db.query(`select count(*) as n from public.assignments where user_id='${coach}'`)).rows[0].n,1);
await actor(coach);
assert.equal(await count('students'),0);
assert.equal(await count('classes'),0);
assert.equal(await count('meetings'),0);
assert.equal(await count('meeting_records'),0);
await denied(`insert into public.meetings(coach_id,extracurricular_id,class_id,title,meeting_date,period,skill)
values ('${coach}','renang','7A','Dijeda','2026-10-17','2026-2027-1','Pernapasan')`);
await denied(`insert into public.meeting_records(meeting_id,student_id,class_id,attendance,grade)
values ('${meeting}','7a-03','7A','hadir','A')`);
await actor(admin);
await db.exec("update public.extracurriculars set is_active=true where id='renang'");
await actor(coach);
assert.equal(await count('meeting_records'),2,'Reactivation restores the same records');
await actor(other);
assert.equal(await count('meetings'),0);
assert.equal(await count('meeting_records'),0);
await denied(`insert into public.meeting_records(meeting_id,student_id,class_id,attendance,grade)
values ('${meeting}','7a-03','7A','hadir','A')`);
await actor(companion);
assert.equal(await count('students'),0);
assert.equal(await count('meeting_records'),0);
await db.exec(`insert into public.documentation(companion_id,companion_name,extracurricular_id,class_id,activity_date,storage_path)
values ('${companion}','Pendamping','renang','7A','2026-10-17','test/photo.jpg')`);
await denied(`insert into public.documentation(companion_id,companion_name,extracurricular_id,class_id,activity_date,storage_path)
values ('${companion}','Pendamping','panahan','7B','2026-10-17','test/wrong.jpg')`);
await actor(admin);
assert.equal(await count('meeting_records'),2);
assert.equal(await count('documentation'),1);
await db.exec(`update public.profiles set is_active=false where id='${coach}'`);
await actor(coach);
assert.equal(await count('students'),0);
assert.equal(await count('meetings'),0);
assert.equal(await count('meeting_records'),0);
await actor(admin);
await db.exec(`select public.update_coach_assignment('${coach}',true,array['renang'],array['7B'])`);
assert.equal((await db.query(`select count(*) as n from public.assignments where user_id='${coach}'`)).rows[0].n,1);
await denied(`select public.update_coach_assignment('${coach}',true,array['renang'],array['INVALID'])`);
assert.equal((await db.query(`select count(*) as n from public.assignments where user_id='${coach}'`)).rows[0].n,1);
assert.equal(await count('meeting_records'),2);
await actor(coach);
assert.equal(await count('students'),14);
assert.equal(await count('meeting_records'),0);
await db.exec('reset role; set role service_role');
for (let i=0;i<10;i++) assert.equal((await db.query("select public.consume_portal_login(repeat('a',64),repeat('b',64)) as allowed")).rows[0].allowed,true);
assert.equal((await db.query("select public.consume_portal_login(repeat('a',64),repeat('b',64)) as allowed")).rows[0].allowed,false);
await db.exec('reset role');
const rls=await db.query(`select tablename from pg_tables where schemaname='public' and not rowsecurity`);
assert.equal(rls.rows.length,0);
console.log('PASS: schema + 137 seeds, anonymous denial, admin access, per-class/eskul coach scope, no self-promotion, grade E, attendance constraints, cross-class rejection, immutable meeting context, actor stamp, companion scope, inactive access revoked, shared extracurricular pause, anonymous safe IDs, coach cannot change status, reactivation retains records.');
await db.close();
