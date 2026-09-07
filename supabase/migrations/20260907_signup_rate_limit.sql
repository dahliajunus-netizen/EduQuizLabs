-- Rate-limit the public signup endpoint.
-- Run this migration in Supabase before deploying the matching application code.

create table if not exists public.signup_rate_limits (
  key text primary key,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0
);

alter table public.signup_rate_limits enable row level security;
alter table public.signup_rate_limits owner to postgres;

revoke all on table public.signup_rate_limits from anon, authenticated;
revoke all on function public.consume_signup_rate_limit(text, integer, integer) from public, anon, authenticated;

create or replace function public.consume_signup_rate_limit(
  p_key text,
  p_limit integer default 10,
  p_window_seconds integer default 3600
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_started timestamptz;
  v_count integer;
begin
  if p_key is null or length(p_key) < 1 or length(p_key) > 200 then
    return false;
  end if;

  if p_limit < 1 or p_limit > 100 or p_window_seconds < 60 or p_window_seconds > 86400 then
    return false;
  end if;

  insert into public.signup_rate_limits(key, window_started_at, request_count)
  values (p_key, v_now, 1)
  on conflict (key) do nothing;

  select window_started_at, request_count
    into v_started, v_count
  from public.signup_rate_limits
  where key = p_key
  for update;

  if v_started <= v_now - make_interval(secs => p_window_seconds) then
    update public.signup_rate_limits
       set window_started_at = v_now,
           request_count = 1
     where key = p_key;
    return true;
  end if;

  if v_count >= p_limit then
    return false;
  end if;

  update public.signup_rate_limits
     set request_count = request_count + 1
   where key = p_key;

  return true;
end;
$$;

grant execute on function public.consume_signup_rate_limit(text, integer, integer) to service_role;

-- Keep the table small. Run this periodically (or add it to your existing
-- scheduled cleanup job) to remove entries that have been idle for a day.
delete from public.signup_rate_limits
where window_started_at < now() - interval '1 day';
