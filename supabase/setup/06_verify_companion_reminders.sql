-- Read-only checks AFTER migration 006, as postgres. No passwords or keys.
select starts_on as reminder_start_date
from app_private.companion_reminder_settings where singleton;
-- One row: activation date in WIB, fixed even after the day changes.
select conname,pg_get_constraintdef(oid) as definition
from pg_constraint where conrelid='public.companion_reports'::regclass
and conname='companion_reports_companion_name_check';
-- Name is limited to 2-120 characters, no longer restricted to the initial list.
select has_function_privilege('anon','public.get_companion_reporting_state()','execute') as anonymous_access,
 has_function_privilege('authenticated','public.get_companion_reporting_state()','execute') as signed_in_access;
-- false, true. The function also verifies an ACTIVE companion/admin role.
select tablename,rowsecurity from pg_tables
where schemaname='app_private' and tablename='companion_reminder_settings';
-- true; direct access is not granted to portal users.
