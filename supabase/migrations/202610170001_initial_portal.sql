-- Run once in a NEW Supabase project, using SQL Editor as postgres.
-- Transactional: an error rolls back this file. Never DROP existing tables to retry.
begin;

create schema app_private;
revoke all on schema app_private from public, anon, authenticated;
grant usage on schema app_private to authenticated, service_role;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete restrict,
  username text not null unique check (username = lower(username) and username ~ '^[a-z][a-z0-9._-]{2,63}$'),
  role text not null check (role in ('admin', 'coach', 'pendamping')),
  display_name text not null check (length(trim(display_name)) between 1 and 120),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.classes (
  id text primary key,
  level text not null check (level in ('SMP', 'SMK'))
);
create table public.extracurriculars (
  id text primary key check (id in ('renang', 'panahan', 'berkuda', 'taekwondo', 'pramuka')),
  name text not null
);
create table public.students (
  id text primary key,
  name text not null check (length(trim(name)) between 1 and 200),
  class_id text not null references public.classes(id),
  is_active boolean not null default true,
  unique (id, class_id)
);
create table public.assignments (
  user_id uuid not null references public.profiles(id) on delete restrict,
  extracurricular_id text not null references public.extracurriculars(id),
  class_id text not null references public.classes(id),
  primary key (user_id, extracurricular_id, class_id)
);
create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id),
  extracurricular_id text not null references public.extracurriculars(id),
  class_id text not null references public.classes(id),
  title text not null check (length(trim(title)) between 1 and 120),
  meeting_date date not null,
  period text not null check (period in ('2026-2027-1', '2026-2027-2')),
  skill text not null check (length(trim(skill)) between 1 and 160),
  -- Snapshot the general A–E scale so later wording changes do not reinterpret old grades.
  grade_descriptions jsonb not null default '{"A":"Sangat baik: mampu melakukan materi atau skill secara mandiri, tepat, dan konsisten.","B":"Baik: mampu melakukan materi atau skill dengan baik dan sedikit arahan.","C":"Cukup: memahami dasar materi atau skill, tetapi masih membutuhkan latihan dan arahan.","D":"Perlu bimbingan: baru menguasai sebagian dasar materi atau skill dan membutuhkan bimbingan rutin.","E":"Perlu pendampingan intensif: belum menunjukkan penguasaan dasar dan membutuhkan latihan bertahap dengan pendampingan."}'::jsonb,
  created_at timestamptz not null default now(),
  unique (id, class_id),
  check (jsonb_typeof(grade_descriptions) = 'object'
    and jsonb_typeof(grade_descriptions->'A') = 'string'
    and jsonb_typeof(grade_descriptions->'B') = 'string'
    and jsonb_typeof(grade_descriptions->'C') = 'string'
    and jsonb_typeof(grade_descriptions->'D') = 'string'
    and jsonb_typeof(grade_descriptions->'E') = 'string'
    and grade_descriptions ?& array['A','B','C','D','E'])
);
create table public.meeting_records (
  meeting_id uuid not null,
  student_id text not null,
  class_id text not null,
  attendance text not null check (attendance in ('hadir', 'izin', 'sakit', 'alpa')),
  grade text check (grade in ('A', 'B', 'C', 'D', 'E')),
  notes text not null default '' check (length(notes) <= 2000),
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  primary key (meeting_id, student_id),
  foreign key (meeting_id, class_id) references public.meetings(id, class_id) on delete restrict,
  foreign key (student_id, class_id) references public.students(id, class_id) on delete restrict,
  check ((attendance = 'hadir' and grade is not null) or (attendance <> 'hadir' and grade is null))
);
create table public.documentation (
  id uuid primary key default gen_random_uuid(),
  companion_id uuid not null references public.profiles(id),
  companion_name text not null check (length(trim(companion_name)) between 1 and 120),
  extracurricular_id text not null references public.extracurriculars(id),
  class_id text not null references public.classes(id),
  activity_date date not null,
  storage_path text not null unique,
  caption text not null default '' check (length(caption) <= 2000),
  created_at timestamptz not null default now()
);

create index students_class_idx on public.students(class_id);
create index assignments_class_idx on public.assignments(class_id, extracurricular_id);
create index meetings_scope_idx on public.meetings(coach_id, extracurricular_id, class_id, meeting_date);
create index meeting_records_student_idx on public.meeting_records(student_id);
create index documentation_scope_idx on public.documentation(companion_id, extracurricular_id, class_id);

-- Helpers accept no actor ID: they always check the authenticated caller.
-- Keep app_private OUT of the Dashboard's exposed API schemas.
create function app_private.has_role(expected text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p
    where p.id = auth.uid() and p.is_active and p.role = expected);
$$;
create function app_private.assigned(eskul text, kelas text, expected_role text) returns boolean
language sql stable security definer set search_path = '' as $$
  select app_private.has_role(expected_role) and exists (
    select 1 from public.assignments a where a.user_id = auth.uid()
      and a.extracurricular_id = eskul and a.class_id = kelas);
$$;
create function app_private.can_read_class(kelas text) returns boolean
language sql stable security definer set search_path = '' as $$
  select app_private.has_role('admin') or (
    (app_private.has_role('coach') or app_private.has_role('pendamping')) and exists (
      select 1 from public.assignments a where a.user_id = auth.uid() and a.class_id = kelas));
$$;
create function app_private.can_read_students(kelas text) returns boolean
language sql stable security definer set search_path = '' as $$
  select app_private.has_role('admin') or (app_private.has_role('coach') and exists (
    select 1 from public.assignments a where a.user_id = auth.uid() and a.class_id = kelas));
$$;
create function app_private.can_manage_meeting(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select app_private.has_role('admin') or exists (
    select 1 from public.meetings m where m.id = target and m.coach_id = auth.uid()
      and app_private.assigned(m.extracurricular_id, m.class_id, 'coach'));
$$;

-- Meeting context becomes immutable once records exist, matching the current UI.
create function app_private.lock_meeting_context() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if row(new.id, new.coach_id, new.extracurricular_id, new.class_id, new.title, new.meeting_date, new.period, new.skill, new.grade_descriptions)
     is distinct from row(old.id, old.coach_id, old.extracurricular_id, old.class_id, old.title, old.meeting_date, old.period, old.skill, old.grade_descriptions)
     and exists (select 1 from public.meeting_records r where r.meeting_id = old.id) then
    raise exception 'Pertemuan sudah memiliki catatan; buat pertemuan baru untuk mengubah materi/konteks.';
  end if;
  return new;
end;
$$;
create trigger lock_meeting_context before update on public.meetings
for each row execute function app_private.lock_meeting_context();
create function app_private.stamp_record() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;
create trigger stamp_record before insert or update on public.meeting_records
for each row execute function app_private.stamp_record();

revoke all on all functions in schema app_private from public, anon, authenticated;
grant execute on function app_private.has_role(text), app_private.assigned(text,text,text),
  app_private.can_read_class(text), app_private.can_read_students(text), app_private.can_manage_meeting(uuid)
  to authenticated;

-- Explicit privileges + RLS; no private table is available to unsigned visitors.
alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.extracurriculars enable row level security;
alter table public.students enable row level security;
alter table public.assignments enable row level security;
alter table public.meetings enable row level security;
alter table public.meeting_records enable row level security;
alter table public.documentation enable row level security;
revoke all on public.profiles, public.classes, public.extracurriculars, public.students,
  public.assignments, public.meetings, public.meeting_records, public.documentation from public, anon, authenticated;
grant select, insert, update, delete on public.profiles, public.classes, public.extracurriculars,
  public.students, public.assignments, public.meetings, public.meeting_records, public.documentation to authenticated, service_role;

create policy profiles_read on public.profiles for select to authenticated
  using (app_private.has_role('admin') or (id = (select auth.uid()) and is_active));
create policy profiles_admin_insert on public.profiles for insert to authenticated with check (app_private.has_role('admin'));
create policy profiles_admin_update on public.profiles for update to authenticated using (app_private.has_role('admin')) with check (app_private.has_role('admin'));
create policy profiles_admin_delete on public.profiles for delete to authenticated using (app_private.has_role('admin'));
create policy classes_read on public.classes for select to authenticated using (app_private.can_read_class(id));
create policy classes_admin on public.classes for all to authenticated using (app_private.has_role('admin')) with check (app_private.has_role('admin'));
create policy eskuls_read on public.extracurriculars for select to authenticated using (
  app_private.has_role('admin') or exists (select 1 from public.assignments a where a.user_id = (select auth.uid()) and a.extracurricular_id = id));
create policy eskuls_admin on public.extracurriculars for all to authenticated using (app_private.has_role('admin')) with check (app_private.has_role('admin'));
create policy students_read on public.students for select to authenticated using (app_private.can_read_students(class_id));
create policy students_admin on public.students for all to authenticated using (app_private.has_role('admin')) with check (app_private.has_role('admin'));
create policy assignments_read on public.assignments for select to authenticated using (
  app_private.has_role('admin') or (user_id = (select auth.uid()) and (app_private.has_role('coach') or app_private.has_role('pendamping'))));
create policy assignments_admin on public.assignments for all to authenticated using (app_private.has_role('admin')) with check (app_private.has_role('admin'));
create policy meetings_read on public.meetings for select to authenticated using (
  app_private.has_role('admin') or (coach_id = (select auth.uid()) and app_private.assigned(extracurricular_id, class_id, 'coach')));
create policy meetings_insert on public.meetings for insert to authenticated with check (
  app_private.has_role('admin') or (coach_id = (select auth.uid()) and app_private.assigned(extracurricular_id, class_id, 'coach')));
create policy meetings_update on public.meetings for update to authenticated using (app_private.can_manage_meeting(id)) with check (
  app_private.has_role('admin') or (coach_id = (select auth.uid()) and app_private.assigned(extracurricular_id, class_id, 'coach')));
create policy meetings_delete on public.meetings for delete to authenticated using (app_private.can_manage_meeting(id));
create policy records_read on public.meeting_records for select to authenticated using (app_private.can_manage_meeting(meeting_id));
create policy records_insert on public.meeting_records for insert to authenticated with check (app_private.can_manage_meeting(meeting_id));
create policy records_update on public.meeting_records for update to authenticated using (app_private.can_manage_meeting(meeting_id)) with check (app_private.can_manage_meeting(meeting_id));
create policy records_admin_delete on public.meeting_records for delete to authenticated using (app_private.has_role('admin'));
create policy documentation_read on public.documentation for select to authenticated using (
  app_private.has_role('admin') or (companion_id = (select auth.uid()) and app_private.assigned(extracurricular_id, class_id, 'pendamping')));
create policy documentation_insert on public.documentation for insert to authenticated with check (
  app_private.has_role('admin') or (companion_id = (select auth.uid()) and app_private.assigned(extracurricular_id, class_id, 'pendamping')));
create policy documentation_update on public.documentation for update to authenticated using (
  app_private.has_role('admin') or (companion_id = (select auth.uid()) and app_private.assigned(extracurricular_id, class_id, 'pendamping')))
  with check (app_private.has_role('admin') or (companion_id = (select auth.uid()) and app_private.assigned(extracurricular_id, class_id, 'pendamping')));
create policy documentation_delete on public.documentation for delete to authenticated using (app_private.has_role('admin'));

insert into public.classes(id, level) values
('7A','SMP'),('7B','SMP'),('8A','SMP'),('8B','SMP'),('9A','SMP'),('9B','SMP'),
('10 RPL','SMK'),('10 DKV','SMK'),('11 RPL','SMK'),('11 DKV','SMK');
insert into public.extracurriculars(id,name) values
('renang','Renang'),('panahan','Panahan'),('berkuda','Berkuda'),('taekwondo','Taekwondo'),('pramuka','Pramuka');
commit;
