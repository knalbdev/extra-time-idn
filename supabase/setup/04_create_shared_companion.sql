-- AFTER migration 005 and creating ONE confirmed Supabase Auth user.
-- Copy to a NEW SQL Editor query; replace only the UID. Never put passwords here.
begin;
do $$
declare target_id uuid := 'GANTI_DENGAN_USER_UID_PENDAMPING_DARI_AUTH';
begin
  if not exists(select 1 from auth.users where id=target_id and email_confirmed_at is not null) then
    raise exception 'Auth user belum ada atau email belum terkonfirmasi.';
  end if;
  insert into public.profiles(id,username,role,display_name)
  values(target_id,'pendamping.eskul','pendamping','Akun Pendamping Bersama');
  -- No per-class or per-eskul assignments: this shared portal can select
  -- all active public schedules, and cannot access students or grades.
end;
$$;
commit;
select username,role,display_name,is_active from public.profiles where username='pendamping.eskul';
