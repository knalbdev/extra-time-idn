-- Read-only. Run in SQL Editor as postgres. No credentials are displayed.
select tablename,rowsecurity from pg_tables where schemaname='app_private'
  and tablename in ('push_subscriptions','push_limits','push_deliveries');
-- Expected: 3 rows, all true.

select table_name,grantee,privilege_type from information_schema.table_privileges
where table_schema='app_private' and table_name in ('push_subscriptions','push_limits','push_deliveries')
and grantee in ('anon','authenticated','PUBLIC');
-- Expected: 0 rows.

select p.oid::regprocedure as unexpected_executable_function,r.role
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
cross join (values('anon'),('authenticated')) r(role)
where n.nspname='public' and p.proname in ('manage_push_subscription','claim_daily_push','finish_daily_push')
and has_function_privilege(r.role,p.oid,'EXECUTE');
-- Expected: 0 rows.

select count(*) as subscribed_devices from app_private.push_subscriptions;
select day,state,count(*) as devices from app_private.push_deliveries
where day>=(now() at time zone 'Asia/Jakarta')::date-7
group by day,state order by day desc,state;
-- sent = accepted by push service; not a read receipt.
