-- Run in Supabase SQL Editor AFTER creating the Auth user and initial schema.
-- Make a new unsaved query and replace these values there; never put passwords here.
begin;
do $$
declare
  target_id uuid := 'GANTI_DENGAN_USER_UID_DARI_AUTHENTICATION_USERS';
  desired_username text := 'admin';
  desired_role text := 'admin'; -- admin / coach / pendamping
  desired_label text := 'Admin'; -- e.g. Coach Renang; Akun Pendamping Bersama for the shared companion account
begin
  if not exists (select 1 from auth.users where id = target_id and email_confirmed_at is not null) then
    raise exception 'Auth user belum ada atau email belum terkonfirmasi. Cek UID dan status user.';
  end if;
  insert into public.profiles(id, username, role, display_name)
  values (target_id, desired_username, desired_role, desired_label);
end;
$$;
commit;
select id, username, role, display_name, is_active from public.profiles order by username;
