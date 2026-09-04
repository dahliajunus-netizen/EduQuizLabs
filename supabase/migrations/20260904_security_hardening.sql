-- EduQuizLabs security hardening follow-up.
-- Run after 20260904_quiz_concurrency.sql.

-- Retire the obsolete public submission RPC from older SQL scripts.
drop function if exists public.submit_test(uuid, uuid, jsonb);

-- Shared password-attempt limiter state. The application should call this
-- through a server-only RPC so rate limiting is shared across instances.
create table if not exists public.assessment_password_rate_limits (
  rate_key text primary key,
  window_started_at timestamptz not null default now(),
  attempt_count integer not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists assessment_password_rate_limits_updated_idx
  on public.assessment_password_rate_limits(updated_at);

alter table public.assessment_password_rate_limits enable row level security;

revoke all on table public.assessment_password_rate_limits from public, anon, authenticated;

drop function if exists public.check_assessment_password_rate_limit(text, integer, integer);

create or replace function public.check_assessment_password_rate_limit(
  p_rate_key text,
  p_max_attempts integer default 8,
  p_window_seconds integer default 60
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.assessment_password_rate_limits%rowtype;
  v_now timestamptz := now();
  v_limited boolean := false;
begin
  if p_rate_key is null or length(trim(p_rate_key)) = 0 then
    raise exception 'RATE_KEY_REQUIRED';
  end if;

  if p_max_attempts < 1 or p_window_seconds < 1 then
    raise exception 'INVALID_RATE_LIMIT';
  end if;

  insert into public.assessment_password_rate_limits (
    rate_key,
    window_started_at,
    attempt_count,
    updated_at
  )
  values (
    p_rate_key,
    v_now,
    1,
    v_now
  )
  on conflict (rate_key) do update
  set
    attempt_count = case
      when public.assessment_password_rate_limits.window_started_at
           + make_interval(secs => p_window_seconds) <= v_now
        then 1
      else public.assessment_password_rate_limits.attempt_count + 1
    end,
    window_started_at = case
      when public.assessment_password_rate_limits.window_started_at
           + make_interval(secs => p_window_seconds) <= v_now
        then v_now
      else public.assessment_password_rate_limits.window_started_at
    end,
    updated_at = v_now
  returning * into v_row;

  v_limited := v_row.attempt_count > p_max_attempts;

  -- Opportunistic cleanup keeps the table bounded without a cron dependency.
  delete from public.assessment_password_rate_limits
  where updated_at < v_now - interval '1 hour'
    and rate_key <> p_rate_key;

  return v_limited;
end;
$$;

revoke all on function public.check_assessment_password_rate_limit(text, integer, integer)
from public, anon, authenticated;

grant execute on function public.check_assessment_password_rate_limit(text, integer, integer)
to service_role;

-- Ensure the active quiz RPCs cannot be called directly by browser roles.
revoke all on function public.start_test_attempt(uuid, uuid)
from public, anon, authenticated;

grant execute on function public.start_test_attempt(uuid, uuid)
to service_role;

revoke all on function public.submit_test_attempt(uuid, uuid, jsonb, boolean)
from public, anon, authenticated;

grant execute on function public.submit_test_attempt(uuid, uuid, jsonb, boolean)
to service_role;

-- NOTE: lock ordering in the existing submission RPC must remain:
-- advisory lock -> attempt row lock. The current application migration was
-- updated to use this order for new deployments; this guard migration does
-- not duplicate the large scoring function.
