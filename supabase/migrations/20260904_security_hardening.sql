-- EduQuizLabs security hardening follow-up.
-- Run after 20260904_quiz_concurrency.sql.

-- Retire the obsolete public submission RPC from older SQL scripts.
drop function if exists public.submit_test(uuid, uuid, jsonb);

-- Shared password-attempt limiter state.
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
begin
  if p_rate_key is null or length(trim(p_rate_key)) = 0 then
    raise exception 'RATE_KEY_REQUIRED';
  end if;
  if p_max_attempts < 1 or p_window_seconds < 1 then
    raise exception 'INVALID_RATE_LIMIT';
  end if;

  insert into public.assessment_password_rate_limits(rate_key, window_started_at, attempt_count, updated_at)
  values (trim(p_rate_key), v_now, 1, v_now)
  on conflict (rate_key) do update
  set
    attempt_count = case
      when public.assessment_password_rate_limits.window_started_at
        + make_interval(secs => p_window_seconds) <= v_now then 1
      else public.assessment_password_rate_limits.attempt_count + 1
    end,
    window_started_at = case
      when public.assessment_password_rate_limits.window_started_at
        + make_interval(secs => p_window_seconds) <= v_now then v_now
      else public.assessment_password_rate_limits.window_started_at
    end,
    updated_at = v_now
  returning * into v_row;

  delete from public.assessment_password_rate_limits
  where updated_at < v_now - interval '1 hour'
    and rate_key <> trim(p_rate_key);

  return v_row.attempt_count > p_max_attempts;
end;
$$;

revoke all on function public.check_assessment_password_rate_limit(text, integer, integer)
from public, anon, authenticated;
grant execute on function public.check_assessment_password_rate_limit(text, integer, integer)
to service_role;

-- Recreate the active submission RPC with one consistent lock order:
-- advisory lock -> attempt row lock. This prevents start/submit deadlocks.
drop function if exists public.submit_test_attempt(uuid, uuid, jsonb, boolean);

create or replace function public.submit_test_attempt(
  p_attempt_id uuid,
  p_student_id uuid,
  p_answers jsonb,
  p_auto_submit boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt public.test_attempts%rowtype;
  v_test public.tests%rowtype;
  v_submission public.test_submissions%rowtype;
  v_questions integer;
  v_correct integer := 0;
  v_score numeric := 0;
  q record;
  pair record;
  submitted text;
  correct text;
  qtype text;
  accepted text[];
  matching_pairs jsonb;
  submitted_match jsonb;
  matching_ok boolean;
begin
  select test_id, student_id, status, answers, started_at, updated_at, completed_at, id
  into v_attempt
  from public.test_attempts
  where id = p_attempt_id and student_id = p_student_id;

  if not found then raise exception 'ATTEMPT_NOT_FOUND'; end if;
  if v_attempt.status <> 'in_progress' then raise exception 'ALREADY_SUBMITTED'; end if;

  perform pg_advisory_xact_lock(
    hashtextextended(v_attempt.test_id::text || ':' || p_student_id::text, 0)
  );

  select * into v_attempt
  from public.test_attempts
  where id = p_attempt_id and student_id = p_student_id
  for update;

  if not found then raise exception 'ATTEMPT_NOT_FOUND'; end if;
  if v_attempt.status <> 'in_progress' then raise exception 'ALREADY_SUBMITTED'; end if;

  select * into v_test
  from public.tests
  where id = v_attempt.test_id and published = true
  for share;

  if not found then raise exception 'TEST_NOT_FOUND'; end if;

  if not p_auto_submit then
    if v_test.due_date is not null and now() >= v_test.due_date then
      raise exception 'DUE_DATE_PASSED';
    end if;
    if v_test.time_limit_minutes is not null
       and v_test.time_limit_minutes > 0
       and now() >= v_attempt.started_at
         + make_interval(mins => v_test.time_limit_minutes) then
      raise exception 'TIME_LIMIT_EXPIRED';
    end if;
  else
    if v_test.time_limit_minutes is null
       or v_test.time_limit_minutes <= 0
       or now() < v_attempt.started_at
         + make_interval(mins => v_test.time_limit_minutes) then
      raise exception 'AUTO_SUBMIT_NOT_EXPIRED';
    end if;
  end if;

  select count(*) into v_questions
  from public.test_questions
  where test_id = v_attempt.test_id;

  for q in
    select * from public.test_questions
    where test_id = v_attempt.test_id
    order by question_order asc, id asc
  loop
    qtype := lower(replace(replace(coalesce(q.question_type, 'multiple_choice'), '-', '_'), ' ', '_'));
    submitted := lower(regexp_replace(trim(coalesce(p_answers ->> q.id::text, '')), '\s+', ' ', 'g'));
    correct := lower(regexp_replace(trim(coalesce(q.correct_answer, '')), '\s+', ' ', 'g'));

    if qtype in ('fill_blank', 'fill_in_blank') then
      accepted := regexp_split_to_array(
        lower(coalesce(nullif(trim(q.option_a), ''), q.correct_answer)),
        '\s*(\|\||;)\s*'
      );
      if submitted <> '' and submitted = any(accepted) then
        v_correct := v_correct + 1;
      end if;

    elsif qtype in ('true_false', 'truefalse', 'boolean') then
      if (submitted in ('a', 'true') and correct in ('a', 'true'))
         or (submitted in ('b', 'false') and correct in ('b', 'false')) then
        v_correct := v_correct + 1;
      end if;

    elsif qtype in ('matching', 'match') then
      matching_ok := false;
      matching_pairs := '[]'::jsonb;
      submitted_match := '{}'::jsonb;
      begin
        if q.option_a is not null and trim(q.option_a) <> '' then
          matching_pairs := trim(q.option_a)::jsonb;
        end if;
        if p_answers ? q.id::text then
          submitted_match := p_answers -> q.id::text;
          if jsonb_typeof(submitted_match) <> 'object' then
            submitted_match := '{}'::jsonb;
          end if;
        end if;
        if jsonb_typeof(matching_pairs) = 'array'
           and jsonb_array_length(matching_pairs) > 0 then
          matching_ok := true;
          for pair in select value from jsonb_array_elements(matching_pairs) loop
            if lower(trim(coalesce(submitted_match ->> (pair.value ->> 'left'), '')))
               <> lower(trim(coalesce(pair.value ->> 'right', ''))) then
              matching_ok := false;
              exit;
            end if;
          end loop;
        end if;
      exception when others then
        matching_ok := false;
      end;
      if matching_ok then v_correct := v_correct + 1; end if;

    elsif submitted <> '' and submitted = correct then
      v_correct := v_correct + 1;
    end if;
  end loop;

  if v_questions > 0 then
    v_score := round((v_correct::numeric / v_questions::numeric) * 100, 2);
  end if;

  update public.test_attempts
  set answers = coalesce(p_answers, '{}'::jsonb),
      status = 'completed',
      completed_at = now(),
      updated_at = now()
  where id = p_attempt_id;

  insert into public.test_submissions(test_id, student_id, answers, score)
  values(v_attempt.test_id, p_student_id, coalesce(p_answers, '{}'::jsonb), v_score)
  returning * into v_submission;

  return jsonb_build_object('submission', to_jsonb(v_submission), 'score', v_score);
end;
$$;

revoke all on function public.start_test_attempt(uuid, uuid)
from public, anon, authenticated;
grant execute on function public.start_test_attempt(uuid, uuid) to service_role;

revoke all on function public.submit_test_attempt(uuid, uuid, jsonb, boolean)
from public, anon, authenticated;
grant execute on function public.submit_test_attempt(uuid, uuid, jsonb, boolean) to service_role;
