-- Run after migration 003. Pausing never deletes schedules, assignments or grades.
begin;
alter table public.extracurriculars add column is_active boolean not null default true;
update public.extracurriculars set is_active = false where id = 'pramuka';

-- Public pages only need the enabled IDs. No anonymous access to any table.
create function public.get_enabled_extracurriculars() returns setof text
language sql stable security definer set search_path = '' as $$
  select id from public.extracurriculars where is_active order by id;
$$;
revoke all on function public.get_enabled_extracurriculars() from public;
grant execute on function public.get_enabled_extracurriculars() to anon, authenticated, service_role;

-- Existing sessions cannot bypass a pause by sending assessment requests directly.
create or replace function app_private.assigned(eskul text, kelas text, expected_role text) returns boolean
language sql stable security definer set search_path = '' as $$
  select app_private.has_role(expected_role) and exists (
    select 1 from public.assignments a join public.extracurriculars e on e.id = a.extracurricular_id
    where a.user_id = auth.uid() and a.extracurricular_id = eskul and a.class_id = kelas and e.is_active);
$$;
create or replace function app_private.can_read_class(kelas text) returns boolean
language sql stable security definer set search_path = '' as $$
  select app_private.has_role('admin') or (
    (app_private.has_role('coach') or app_private.has_role('pendamping')) and exists (
      select 1 from public.assignments a join public.extracurriculars e on e.id = a.extracurricular_id
      where a.user_id = auth.uid() and a.class_id = kelas and e.is_active));
$$;
create or replace function app_private.can_read_students(kelas text) returns boolean
language sql stable security definer set search_path = '' as $$
  select app_private.has_role('admin') or (app_private.has_role('coach') and exists (
    select 1 from public.assignments a join public.extracurriculars e on e.id = a.extracurricular_id
    where a.user_id = auth.uid() and a.class_id = kelas and e.is_active));
$$;
commit;
