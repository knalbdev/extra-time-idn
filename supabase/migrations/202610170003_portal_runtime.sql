-- Run once AFTER the initial schema + seed. Required before real login is enabled.
begin;
-- SELECT must use the inserted row directly: a STABLE helper re-querying the
-- table cannot see a new row during INSERT ... RETURNING (PostgREST .select()).
drop policy meetings_read on public.meetings;
create policy meetings_read on public.meetings for select to authenticated using (
  app_private.has_role('admin') or (coach_id = (select auth.uid()) and app_private.assigned(extracurricular_id, class_id, 'coach')));
create table app_private.login_attempts (
  bucket text primary key,
  started_at timestamptz not null,
  attempts integer not null
);
alter table app_private.login_attempts enable row level security;
revoke all on app_private.login_attempts from public, anon, authenticated;
-- Persistent limits work across Vercel instances; store hashes, never passwords/IPs.
create function public.consume_portal_login(account_hash text, client_hash text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare n integer; key text;
begin
  if account_hash !~ '^[a-f0-9]{64}$' or client_hash !~ '^[a-f0-9]{64}$' then return false; end if;
  delete from app_private.login_attempts where started_at < now() - interval '2 hours';
  foreach key in array array['ip:' || client_hash, 'account:' || account_hash] loop
    insert into app_private.login_attempts as l (bucket,started_at,attempts)
    values (key, now(), 1)
    on conflict (bucket) do update set
      attempts = case when l.started_at < now() - interval '15 minutes' then 1 else l.attempts + 1 end,
      started_at = case when l.started_at < now() - interval '15 minutes' then now() else l.started_at end
    returning attempts into n;
    if (key like 'ip:%' and n > 60) or (key like 'account:%' and n > 10) then return false; end if;
  end loop;
  return true;
end;
$$;
revoke all on function public.consume_portal_login(text,text) from public, anon, authenticated;
grant execute on function public.consume_portal_login(text,text) to service_role;

-- Transactional replacement prevents partially cleared coach assignments.
create function public.update_coach_assignment(target_id uuid, active boolean, selected_eskuls text[], selected_classes text[]) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not app_private.has_role('admin') then raise exception 'Admin required' using errcode='42501'; end if;
  if target_id = auth.uid() or not exists (select 1 from public.profiles where id=target_id and role='coach') then raise exception 'Coach required'; end if;
  if coalesce(array_length(selected_eskuls,1),0) not between 1 and 5
    or coalesce(array_length(selected_classes,1),0) not between 1 and 10
    or exists (select 1 from unnest(selected_eskuls) e where e is null or not exists (select 1 from public.extracurriculars where id=e))
    or exists (select 1 from unnest(selected_classes) c where c is null or not exists (select 1 from public.classes where id=c)) then raise exception 'Invalid assignment'; end if;
  perform 1 from public.profiles where id=target_id for update;
  update public.profiles set is_active=active where id=target_id;
  delete from public.assignments where user_id=target_id;
  insert into public.assignments(user_id,extracurricular_id,class_id)
    select target_id,e,c from (select distinct unnest(selected_eskuls) as e) es cross join (select distinct unnest(selected_classes) as c) cs;
end;
$$;
revoke all on function public.update_coach_assignment(uuid,boolean,text[],text[]) from public, anon;
grant execute on function public.update_coach_assignment(uuid,boolean,text[],text[]) to authenticated;
commit;
