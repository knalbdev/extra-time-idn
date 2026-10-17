-- Read-only checks in SQL Editor as postgres. No passwords or API keys needed.
select 'classes' as item, count(*) from public.classes
union all select 'extracurriculars', count(*) from public.extracurriculars
union all select 'students', count(*) from public.students;
-- Expected: 10 classes, 5 extracurriculars, 137 students.
select c.id as class, c.level, count(s.id) as students
from public.classes c left join public.students s on s.class_id = c.id
group by c.id, c.level order by c.level, c.id;
-- 7A 13; 7B 14; 8A 12; 8B 13; 9A 13; 9B 14;
-- 10 RPL 13; 10 DKV 14; 11 RPL 15; 11 DKV 16.
select tablename, rowsecurity from pg_tables
where schemaname = 'public' and tablename in
('profiles','classes','extracurriculars','students','assignments','meetings','meeting_records','documentation');
-- All 8 tables must show rowsecurity = true.
select p.username, p.role, p.is_active, count(a.class_id) as assignments
from public.profiles p left join public.assignments a on a.user_id = p.id
group by p.id order by p.username;
-- Admin normally has 0 assignments; role grants complete access.
select table_name, privilege_type from information_schema.table_privileges
where table_schema = 'public' and grantee = 'anon' and table_name in
('profiles','classes','extracurriculars','students','assignments','meetings','meeting_records','documentation');
-- Must return 0 rows. SQL Editor as postgres bypasses RLS; this is not a login test.
