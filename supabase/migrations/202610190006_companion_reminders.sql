-- Run once AFTER 005. Keeps existing reports and the shared account intact.
begin;
alter table public.companion_reports drop constraint companion_reports_companion_name_check;
alter table public.companion_reports add constraint companion_reports_companion_name_check
  check (length(btrim(companion_name)) between 2 and 120 and companion_name !~ '[[:cntrl:]<>]');

-- Start on the activation date in Jakarta, not the beginning of the workbook.
-- Keeping this date fixed lets overdue reminders carry over into following days.
create table app_private.companion_reminder_settings (
  singleton boolean primary key default true check (singleton),
  starts_on date not null
);
insert into app_private.companion_reminder_settings(singleton,starts_on)
values(true,(now() at time zone 'Asia/Jakarta')::date);
alter table app_private.companion_reminder_settings enable row level security;
revoke all on app_private.companion_reminder_settings from public,anon,authenticated;

-- Only completion metadata is exposed: no names, notes, links or account IDs.
-- Direct access to reports remains restricted to admins by existing RLS.
create function public.get_companion_reporting_state() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare start_date date;
begin
  if not (app_private.has_role('pendamping') or app_private.has_role('admin'))
    then raise exception 'Companion or admin required' using errcode='42501'; end if;
  select starts_on into strict start_date from app_private.companion_reminder_settings where singleton;
  return jsonb_build_object(
    'startsOn',start_date,
    'checkedAt',now(),
    'completed',coalesce((
      select jsonb_agg(jsonb_build_object(
        'source_spreadsheet',r.source_spreadsheet,'extracurricular_id',r.extracurricular_id,
        'activity_date',r.activity_date,'activity_time',r.activity_time,'class_ids',r.class_ids))
      from (select distinct source_spreadsheet,extracurricular_id,activity_date,activity_time,class_ids
        from public.companion_reports
        where activity_date>=start_date and activity_date<=(now() at time zone 'Asia/Jakarta')::date) r
    ),'[]'::jsonb));
end;
$$;
revoke all on function public.get_companion_reporting_state() from public,anon;
grant execute on function public.get_companion_reporting_state() to authenticated;
commit;
