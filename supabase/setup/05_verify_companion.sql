-- Read-only checks, as postgres. No secrets or passwords.
select username,role,is_active from public.profiles where username='pendamping.eskul';
-- Expected: one row, role pendamping, is_active true.
select tablename,rowsecurity from pg_tables where schemaname='public' and tablename='companion_reports';
-- Expected: one row with rowsecurity=true.
select has_function_privilege('anon','public.submit_companion_report(uuid,uuid,text,text,text,text,date,text,text[],text,text)','execute') as anon_can_submit,
 has_function_privilege('authenticated','public.submit_companion_report(uuid,uuid,text,text,text,text,date,text,text[],text,text)','execute') as authenticated_can_submit,
 has_function_privilege('service_role','public.submit_companion_report(uuid,uuid,text,text,text,text,date,text,text[],text,text)','execute') as server_can_submit;
-- Expected: false, false, true. The verified server action handles submissions.
select count(*) as reports from public.companion_reports;
-- Initially 0. SQL Editor bypasses RLS; verify real login separately.
