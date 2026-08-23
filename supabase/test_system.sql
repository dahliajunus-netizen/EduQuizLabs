-- EduQuizLabs test system
-- Run this in Supabase SQL Editor after creating tests, test_questions,
-- and test_submissions.

-- Prevent a student from having more than one submission for a test.
create unique index if not exists test_submissions_test_student_unique
on public.test_submissions (test_id, student_id);

-- Atomically grade and insert a student's test submission.
-- answers must be a JSON object like {"question_uuid":"A","question_uuid_2":"C"}.
create or replace function public.submit_test(
  p_test_id uuid,
  p_student_id uuid,
  p_answers jsonb
)
returns public.test_submissions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_question record;
  v_answer text;
  v_total numeric := 0;
  v_earned numeric := 0;
  v_score numeric := 0;
  v_submission public.test_submissions;
begin
  if p_test_id is null or p_student_id is null then
    raise exception 'Missing test or student id';
  end if;

  if exists (
    select 1
    from public.test_submissions
    where test_id = p_test_id
      and student_id = p_student_id
  ) then
    raise exception 'You have already submitted this test.';
  end if;

  if not exists (
    select 1 from public.tests
    where id = p_test_id
      and published = true
  ) then
    raise exception 'This test is not published.';
  end if;

  for v_question in
    select id, correct_answer, points
    from public.test_questions
    where test_id = p_test_id
    order by question_order asc, id asc
  loop
    v_total := v_total + greatest(coalesce(v_question.points, 1), 0);
    v_answer := upper(coalesce(p_answers ->> v_question.id::text, ''));

    if v_answer = upper(coalesce(v_question.correct_answer, '')) then
      v_earned := v_earned + greatest(coalesce(v_question.points, 1), 0);
    end if;
  end loop;

  if v_total > 0 then
    v_score := round((v_earned / v_total) * 100, 2);
  else
    v_score := 0;
  end if;

  insert into public.test_submissions (
    test_id,
    student_id,
    score,
    submitted_at,
    answers
  ) values (
    p_test_id,
    p_student_id,
    v_score,
    now(),
    coalesce(p_answers, '{}'::jsonb)
  )
  returning * into v_submission;

  return v_submission;
exception
  when unique_violation then
    raise exception 'You have already submitted this test.';
end;
$$;

revoke all on function public.submit_test(uuid, uuid, jsonb) from public;
