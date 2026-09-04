-- EduQuizLabs quiz concurrency/security migration
-- Run this migration in Supabase SQL Editor.
-- Starts/submissions are serialized per student+test, and deadlines are
-- enforced inside PostgreSQL rather than trusting the client/API clock.

create unique index if not exists test_attempts_one_active_per_student
on public.test_attempts (test_id, student_id)
where status = 'in_progress';

create or replace function public.start_test_attempt(
  p_test_id uuid,
  p_student_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt public.test_attempts%rowtype;
  v_max_attempts integer;
  v_submission_count integer;
  v_test public.tests%rowtype;
begin
  -- Serialize all attempt creation/submission operations for this
  -- exact student+test pair. This closes the max-attempt race even
  -- after an older attempt has just been completed.
  perform pg_advisory_xact_lock(
    hashtextextended(p_test_id::text || ':' || p_student_id::text, 0)
  );

  select * into v_test
  from public.tests
  where id = p_test_id
    and published = true
  for share;

  if not found then
    raise exception 'TEST_NOT_FOUND';
  end if;

  if v_test.due_date is not null and now() >= v_test.due_date then
    raise exception 'DUE_DATE_PASSED';
  end if;

  select * into v_attempt
  from public.test_attempts
  where test_id = p_test_id
    and student_id = p_student_id
    and status = 'in_progress'
  order by started_at desc
  limit 1
  for update;

  if found then
    return to_jsonb(v_attempt);
  end if;

  v_max_attempts := greatest(1, coalesce(v_test.max_attempts, 1));

  select count(*)
  into v_submission_count
  from public.test_submissions
  where test_id = p_test_id
    and student_id = p_student_id;

  if v_submission_count >= v_max_attempts then
    raise exception 'MAX_ATTEMPTS';
  end if;

  insert into public.test_attempts (
    test_id,
    student_id,
    status,
    answers,
    started_at,
    updated_at
  )
  values (
    p_test_id,
    p_student_id,
    'in_progress',
    '{}'::jsonb,
    now(),
    now()
  )
  returning * into v_attempt;

  return to_jsonb(v_attempt);
exception
  when unique_violation then
    select * into v_attempt
    from public.test_attempts
    where test_id = p_test_id
      and student_id = p_student_id
      and status = 'in_progress'
    order by started_at desc
    limit 1;

    if found then
      return to_jsonb(v_attempt);
    end if;

    raise;
end;
$$;


create or replace function public.submit_test_attempt(
  p_attempt_id uuid,
  p_student_id uuid,
  p_answers jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt public.test_attempts%rowtype;
  v_test public.tests%rowtype;
  v_score numeric;
  v_submission public.test_submissions%rowtype;
  v_questions integer;
  v_correct integer := 0;
  q record;
  submitted text;
  correct text;
  qtype text;
  accepted text[];
  matching_ok boolean;
  matching_pairs jsonb;
  submitted_match jsonb;
  pair record;
begin
  select * into v_attempt
  from public.test_attempts
  where id = p_attempt_id
    and student_id = p_student_id
  for update;

  if not found then
    raise exception 'ATTEMPT_NOT_FOUND';
  end if;

  if v_attempt.status <> 'in_progress' then
    raise exception 'ALREADY_SUBMITTED';
  end if;

  -- Lock the same student+test key used by start_test_attempt so a
  -- completed attempt cannot race a brand-new attempt.
  perform pg_advisory_xact_lock(
    hashtextextended(v_attempt.test_id::text || ':' || p_student_id::text, 0)
  );

  select * into v_test
  from public.tests
  where id = v_attempt.test_id
    and published = true
  for share;

  if not found then
    raise exception 'TEST_NOT_FOUND';
  end if;

  if v_test.due_date is not null and now() >= v_test.due_date then
    raise exception 'DUE_DATE_PASSED';
  end if;

  if v_test.time_limit_minutes is not null
     and v_test.time_limit_minutes > 0
     and now() >= v_attempt.started_at + make_interval(mins => v_test.time_limit_minutes)
  then
    raise exception 'TIME_LIMIT_EXPIRED';
  end if;

  select count(*)
  into v_questions
  from public.test_questions
  where test_id = v_attempt.test_id;

  for q in
    select *
    from public.test_questions
    where test_id = v_attempt.test_id
    order by question_order asc, id asc
  loop
    qtype := lower(
      replace(
        replace(coalesce(q.question_type, 'multiple_choice'), '-', '_'),
        ' ',
        '_'
      )
    );

    submitted := lower(
      regexp_replace(
        trim(coalesce(p_answers ->> q.id::text, '')),
        '\s+',
        ' ',
        'g'
      )
    );

    correct := lower(
      regexp_replace(
        trim(coalesce(q.correct_answer, '')),
        '\s+',
        ' ',
        'g'
      )
    );

    if qtype in ('fill_blank', 'fill_in_blank') then
      accepted := regexp_split_to_array(
        lower(coalesce(nullif(trim(q.option_a), ''), q.correct_answer)),
        '\s*(\|\||;)\s*'
      );

      if submitted <> '' and submitted = any(accepted) then
        v_correct := v_correct + 1;
      end if;

    elsif qtype in ('true_false', 'truefalse', 'boolean') then
      if (
        submitted in ('a', 'true') and correct in ('a', 'true')
      ) or (
        submitted in ('b', 'false') and correct in ('b', 'false')
      ) then
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
          submitted_match := (p_answers -> q.id::text);
          if jsonb_typeof(submitted_match) <> 'object' then
            submitted_match := '{}'::jsonb;
          end if;
        end if;

        if jsonb_typeof(matching_pairs) = 'array'
           and jsonb_array_length(matching_pairs) > 0
        then
          matching_ok := true;

          for pair in
            select value
            from jsonb_array_elements(matching_pairs)
          loop
            if lower(trim(coalesce(submitted_match ->> (pair.value ->> 'left'), '')))
               <> lower(trim(coalesce(pair.value ->> 'right', '')))
            then
              matching_ok := false;
              exit;
            end if;
          end loop;
        end if;
      exception
        when others then
          matching_ok := false;
      end;

      if matching_ok then
        v_correct := v_correct + 1;
      end if;

    elsif submitted <> '' and submitted = correct then
      v_correct := v_correct + 1;
    end if;
  end loop;

  if v_questions = 0 then
    v_score := 0;
  else
    v_score := round(
      (v_correct::numeric / v_questions::numeric) * 100,
      2
    );
  end if;

  -- These two writes are one transaction: either both succeed or
  -- PostgreSQL rolls both back.
  update public.test_attempts
  set
    answers = p_answers,
    status = 'completed',
    completed_at = now(),
    updated_at = now()
  where id = p_attempt_id;

  insert into public.test_submissions (
    test_id,
    student_id,
    answers,
    score
  )
  values (
    v_attempt.test_id,
    p_student_id,
    p_answers,
    v_score
  )
  returning * into v_submission;

  return jsonb_build_object(
    'submission', to_jsonb(v_submission),
    'score', v_score
  );
end;
$$;


-- RPCs are intended to be called only by the trusted server path.
revoke all on function public.start_test_attempt(uuid, uuid)
from public, anon, authenticated;

grants execute on function public.start_test_attempt(uuid, uuid)
to service_role;

revoke all on function public.submit_test_attempt(uuid, uuid, jsonb)
from public, anon, authenticated;

grants execute on function public.submit_test_attempt(uuid, uuid, jsonb)
to service_role;
