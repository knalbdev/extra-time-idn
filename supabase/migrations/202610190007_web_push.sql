-- Run once AFTER 006. Public visitors opt in per device; no Auth user needed.
-- Browser subscription credentials are private, accessed through service-only RPCs.
begin;
create table app_private.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique check(length(endpoint) between 10 and 2048),
  owner_hash text not null check(owner_hash ~ '^[a-f0-9]{64}$'),
  p256dh text not null check(length(p256dh)=87),
  auth_key text not null check(length(auth_key)=22),
  created_at timestamptz not null default now(),
  last_test_at timestamptz
);
create table app_private.push_limits (
  bucket text primary key, started_at timestamptz not null, attempts integer not null
);
create table app_private.push_deliveries (
  subscription_id uuid references app_private.push_subscriptions(id) on delete cascade,
  day date not null,
  state text not null default 'pending' check(state in ('pending','sending','sent','failed')),
  attempts integer not null default 0,
  lease uuid,
  available_at timestamptz not null default now(),
  last_status integer,
  primary key(subscription_id,day)
);
create index push_deliveries_queue on app_private.push_deliveries(day,state,available_at);
alter table app_private.push_subscriptions enable row level security;
alter table app_private.push_limits enable row level security;
alter table app_private.push_deliveries enable row level security;
revoke all on app_private.push_subscriptions,app_private.push_limits,app_private.push_deliveries from public,anon,authenticated;

create function public.manage_push_subscription(operation text, push_endpoint text, owner_hash text,
  client_hash text, public_key text default null, auth_secret text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare n integer; result jsonb;
begin
  if owner_hash !~ '^[a-f0-9]{64}$' or client_hash !~ '^[a-f0-9]{64}$'
    or operation not in ('subscribe','unsubscribe','status','test') then raise exception 'Invalid request'; end if;
  delete from app_private.push_limits where started_at < now()-interval '1 day';
  insert into app_private.push_limits as l values(client_hash,now(),1)
    on conflict(bucket) do update set
      attempts=case when l.started_at<now()-interval '15 minutes' then 1 else l.attempts+1 end,
      started_at=case when l.started_at<now()-interval '15 minutes' then now() else l.started_at end
    returning attempts into n;
  if n>120 then return jsonb_build_object('limited',true); end if;
  if operation='subscribe' then
    insert into app_private.push_subscriptions as s(endpoint,owner_hash,p256dh,auth_key)
      values(push_endpoint,owner_hash,public_key,auth_secret)
      on conflict(endpoint) do update set p256dh=excluded.p256dh,auth_key=excluded.auth_key
      where s.owner_hash=excluded.owner_hash;
    return jsonb_build_object('enabled',exists(select 1 from app_private.push_subscriptions s
      where s.endpoint=push_endpoint and s.owner_hash=manage_push_subscription.owner_hash));
  elsif operation='unsubscribe' then
    delete from app_private.push_subscriptions s where s.endpoint=push_endpoint and s.owner_hash=manage_push_subscription.owner_hash;
    return jsonb_build_object('enabled',false);
  elsif operation='test' then
    update app_private.push_subscriptions s set last_test_at=now()
      where s.endpoint=push_endpoint and s.owner_hash=manage_push_subscription.owner_hash
      and (last_test_at is null or last_test_at<now()-interval '1 minute')
      returning jsonb_build_object('endpoint',s.endpoint,'keys',jsonb_build_object('p256dh',s.p256dh,'auth',s.auth_key)) into result;
    return jsonb_build_object('subscription',result);
  end if;
  return jsonb_build_object('enabled',exists(select 1 from app_private.push_subscriptions s
    where s.endpoint=push_endpoint and s.owner_hash=manage_push_subscription.owner_hash));
end;
$$;

-- Atomic leases allow overlapping/retried scheduler calls. Successful deliveries
-- are unique per device/day. A crashed worker becomes retryable after 2 minutes.
create function public.claim_daily_push(target_day date) returns table(
  subscription_id uuid, endpoint text, p256dh text, auth_key text, lease uuid)
language plpgsql security definer set search_path='' as $$
begin
  if target_day<>(now() at time zone 'Asia/Jakarta')::date
    or extract(hour from now() at time zone 'Asia/Jakarta')<>8 then return; end if;
  delete from app_private.push_deliveries d where d.day<target_day-7;
  insert into app_private.push_deliveries(subscription_id,day)
    select s.id,target_day from app_private.push_subscriptions s on conflict do nothing;
  return query with candidates as (
    select d.subscription_id from app_private.push_deliveries d
    where d.day=target_day and d.state in ('pending','sending') and d.attempts<3 and d.available_at<=now()
    order by d.subscription_id limit 10 for update skip locked
  ), claimed as (
    update app_private.push_deliveries d set state='sending',attempts=d.attempts+1,
      lease=gen_random_uuid(),available_at=now()+interval '2 minutes'
    from candidates c where d.subscription_id=c.subscription_id and d.day=target_day
    returning d.subscription_id,d.lease
  ) select s.id,s.endpoint,s.p256dh,s.auth_key,c.lease
    from claimed c join app_private.push_subscriptions s on s.id=c.subscription_id;
end;
$$;

create function public.finish_daily_push(target_id uuid,target_day date,claim_lease uuid,response_status integer) returns void
language plpgsql security definer set search_path='' as $$
begin
  if not exists(select 1 from app_private.push_deliveries d where d.subscription_id=target_id
    and d.day=target_day and d.lease=claim_lease and d.state='sending') then return; end if;
  if response_status in (404,410) then
    delete from app_private.push_subscriptions where id=target_id;
  else
    update app_private.push_deliveries d set
      state=case when response_status between 200 and 299 then 'sent' when attempts>=3 then 'failed' else 'pending' end,
      last_status=response_status,available_at=now()+interval '3 minutes'
      where d.subscription_id=target_id and d.day=target_day and d.lease=claim_lease;
  end if;
end;
$$;
revoke all on function public.manage_push_subscription(text,text,text,text,text,text),public.claim_daily_push(date),public.finish_daily_push(uuid,date,uuid,integer) from public,anon,authenticated;
grant execute on function public.manage_push_subscription(text,text,text,text,text,text),public.claim_daily_push(date),public.finish_daily_push(uuid,date,uuid,integer) to service_role;
commit;
