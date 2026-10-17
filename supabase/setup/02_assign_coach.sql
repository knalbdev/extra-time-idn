-- Run AFTER creating a coach profile. The example grants Renang for ALL 10 classes.
-- Change the UUID and eskul in a fresh SQL Editor query before running.
begin;
do $$
declare
  target_id uuid := 'GANTI_DENGAN_UID_AKUN_COACH';
  target_eskul text := 'renang';
begin
  if not exists (select 1 from public.profiles where id = target_id and role = 'coach' and is_active) then
    raise exception 'Profil coach aktif belum ditemukan.';
  end if;
  insert into public.assignments(user_id, extracurricular_id, class_id)
  select target_id, target_eskul, c.id from public.classes c
  -- To assign only selected classes, uncomment and adjust ONE filter below:
  -- where c.level = 'SMP'
  -- where c.id in ('7A', '7B')
  on conflict do nothing;
end;
$$;
commit;
select p.username, a.extracurricular_id, a.class_id
from public.assignments a join public.profiles p on p.id = a.user_id
order by p.username, a.extracurricular_id, a.class_id;
