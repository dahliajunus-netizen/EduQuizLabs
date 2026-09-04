-- Run this migration in Supabase SQL Editor.
-- It adds transactional RPCs used by the student test API.

create or replace function public.start_test_attempt(p_test_id text, p_student_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt public.test_attempts%rowtype;
  v_existing public.test_attempts%rowtype;
  v_max_attempts integer;
  v_submission_count integer;
begin
  select * into v_existing
  from public.test_attempts
  where test_id::text = p_test_id and student_id = p_student_id and status = 'in_progress'
  order by started_at desc
  limit 1
  for update;

  if found then
    return to_jsonb(v_existing);
  end if;

  select greatest(1, coalesce(max_attempts, 1)) into v_max_attempts
  from public.tests where id::text = p_test_id and published = true;

  if v_max_attempts is null then
    raise exception 'TEST_NOT_FOUND';
  end if;

  select count(*) into v_submission_count
  from public.test_submissions
  where test_id::text = p_test_id and student_id = p_student_id;

  if v_submission_count >= v_max_attempts then
    raise exception 'MAX_ATTEMPTS';
  end if;

  insert into public.test_attempts (test_id, student_id, status, answers, started_at, updated_at)
  values (p_test_id::uuid, p_student_id, 'in_progress', '{}'::jsonb, now(), now())
  returning * into v_attempt;

  return to_jsonb(v_attempt);
exception
  when unique_violation then
    select * into v_attempt
    from public.test_attempts
    where test_id::text = p_test_id and student_id = p_student_id and status = 'in_progress'
    order by started_at desc limit 1;
    if found then return to_jsonb(v_attempt); end if;
    raise;
end;
$$;

create or replace function public.submit_test_attempt(p_attempt_id uuid, p_student_id uuid, p_answers jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt public.test_attempts%rowtype;
  v_test_id uuid;
  v_score numeric;
  v_submission public.test_submissions%rowtype;
  v_questions integer;
  v_correct integer;
  q record;
  v_value text;
  v_correct_value text;
begin
  select * into v_attempt
  from public.test_attempts
  where id = p_attempt_id and student_id = p_student_id
  for update;

  if not found then raise exception 'ATTEMPT_NOT_FOUND'; end if;
  if v_attempt.status <> 'in_progress' then raise exception 'ALREADY_SUBMITTED'; end if;

  v_test_id := v_attempt.test_id;

  select count(*) into v_questions from public.test_questions where test_id = v_test_id;
  v_correct := 0;

  for q in select * from public.test_questions where test_id = v_test_id loop
    v_value := lower(trim(coalesce(p_answers ->> q.id::text, '')));
    v_correct_value := lower(trim(coalesce(q.correct_answer, '')));
    if v_value <> '' and v_value = v_correct_value then v_correct := v_correct + 1; end if;
  end loop;

  if v_questions = 0 then v_score := 0; else v_score := round((v_correct::numeric / v_questions::numeric) * 100, 2); end if;

  update public.test_attempts
  set answers = p_answers, status = 'completed', completed_at = now(), updated_at = now()
  where id = p_attempt_id;

  insert into public.test_submissions (test_id, student_id, answers, score)
  values (v_test_id, p_student_id, p_answers, v_score)
  returning * into v_submission;

  return jsonb_build_object('submission', to_jsonb(v_submission), 'score', v_score);
end;
$$;

revoke all on function public.start_test_attempt(text, uuid) from public;
revoke all on function public.submit_test_attempt(uuid, uuid, jsonb) from public;
