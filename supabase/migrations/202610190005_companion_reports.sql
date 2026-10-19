-- Run after 004. A shared companion account submits Drive links, not files.
-- Existing documentation, attendance and grades remain intact.
begin;
create table public.companion_reports (
  id uuid primary key,
  submitted_by uuid not null references public.profiles(id),
  companion_name text not null check (companion_name in (
    'Astiana Utami','Icha Oktaviana','Marwiyah Annafisah','Nabilah Rahmah',
    'Syelvi Amelia Suryana','Rahimatul Hikmah','Intan Ayu Radeansyach','Nusaibah Zata',
    'Annida Mar’athus Shaleha','Cahya Camila Hamidah','Alma Zakaria','Shofiyyah')),
  schedule_id text not null check (length(schedule_id) between 1 and 1000),
  source_spreadsheet text not null check (length(source_spreadsheet) between 1 and 100),
  extracurricular_id text not null references public.extracurriculars(id),
  activity_date date not null,
  activity_time text not null check (length(trim(activity_time)) between 1 and 200),
  class_ids text[] not null check (cardinality(class_ids) between 1 and 10 and array_position(class_ids,null) is null
    and class_ids <@ array['7A','7B','8A','8B','9A','9B','10 RPL','10 DKV','11 RPL','11 DKV']::text[]),
  notes text not null default '' check (length(notes) <= 2000),
  drive_url text not null check (length(drive_url) <= 2048 and drive_url ~ '^https://(drive|docs)[.]google[.]com/'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);
create index companion_reports_created_idx on public.companion_reports(created_at desc,id desc);
create index companion_reports_scope_idx on public.companion_reports(extracurricular_id,activity_date);
alter table public.companion_reports enable row level security;
revoke all on public.companion_reports from public, anon, authenticated;
grant select, delete on public.companion_reports to authenticated;
grant update(companion_name,notes,drive_url) on public.companion_reports to authenticated;
grant all on public.companion_reports to service_role;
create policy companion_reports_admin_read on public.companion_reports for select to authenticated using (app_private.has_role('admin'));
create policy companion_reports_admin_update on public.companion_reports for update to authenticated using (app_private.has_role('admin')) with check (app_private.has_role('admin'));
create policy companion_reports_admin_delete on public.companion_reports for delete to authenticated using (app_private.has_role('admin'));

create function app_private.stamp_companion_report() returns trigger
language plpgsql security definer set search_path = '' as $$
begin new.updated_at=now(); new.updated_by=auth.uid(); return new; end;
$$;
create trigger companion_report_stamp before update on public.companion_reports for each row execute function app_private.stamp_companion_report();

-- Server-only: the action verifies the authenticated caller and resolves the
-- session against the current spreadsheet before supplying this snapshot.
-- The shared account has no direct read/write access to submitted reports.
create function public.submit_companion_report(actor_id uuid, report_id uuid, selected_name text,
  selected_session text, session_source text, session_eskul text, session_date date,
  session_time text, session_classes text[], report_notes text, report_drive_url text) returns uuid
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.profiles where id=actor_id and role='pendamping' and is_active)
    then raise exception 'Companion required' using errcode='42501'; end if;
  if not exists (select 1 from public.extracurriculars where id=session_eskul and is_active)
    then raise exception 'Active extracurricular required' using errcode='42501'; end if;
  insert into public.companion_reports(id,submitted_by,companion_name,schedule_id,source_spreadsheet,
    extracurricular_id,activity_date,activity_time,class_ids,notes,drive_url)
  values(report_id,actor_id,selected_name,selected_session,session_source,session_eskul,session_date,session_time,session_classes,report_notes,report_drive_url)
  on conflict(id) do nothing;
  if not exists (select 1 from public.companion_reports r where r.id=report_id and r.submitted_by=actor_id
    and r.companion_name=selected_name and r.schedule_id=selected_session and r.source_spreadsheet=session_source
    and r.extracurricular_id=session_eskul and r.activity_date=session_date and r.activity_time=session_time
    and r.class_ids=session_classes and r.notes=report_notes and r.drive_url=report_drive_url)
    then raise exception 'Submission ID conflict'; end if;
  return report_id;
end;
$$;
revoke all on function public.submit_companion_report(uuid,uuid,text,text,text,text,date,text,text[],text,text) from public,anon,authenticated;
grant execute on function public.submit_companion_report(uuid,uuid,text,text,text,text,date,text,text[],text,text) to service_role;

-- Twelve people may use the shared account. Keep the original coach/admin
-- limit, while allowing 30 total attempts for an active companion account.
-- The per-network limit remains 60 attempts per 15 minutes.
create or replace function public.consume_portal_login(account_hash text, client_hash text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare n integer; key text; account_limit integer := 10;
begin
  if account_hash !~ '^[a-f0-9]{64}$' or client_hash !~ '^[a-f0-9]{64}$' then return false; end if;
  if exists (select 1 from public.profiles where role='pendamping' and is_active
    and pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(username,'UTF8')),'hex')=account_hash)
    then account_limit:=30; end if;
  delete from app_private.login_attempts where started_at < now() - interval '2 hours';
  foreach key in array array['ip:' || client_hash, 'account:' || account_hash] loop
    insert into app_private.login_attempts as l(bucket,started_at,attempts) values(key,now(),1)
    on conflict(bucket) do update set
      attempts=case when l.started_at<now()-interval '15 minutes' then 1 else l.attempts+1 end,
      started_at=case when l.started_at<now()-interval '15 minutes' then now() else l.started_at end
    returning attempts into n;
    if (key like 'ip:%' and n>60) or (key like 'account:%' and n>account_limit) then return false; end if;
  end loop;
  return true;
end;
$$;
commit;
