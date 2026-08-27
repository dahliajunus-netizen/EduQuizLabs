-- ISIF / EduQuizLabs Tests RPC
-- Run this entire file in Supabase SQL Editor.

-- Tests belong to a course as well as a class.
-- Existing tests remain valid because course_id is nullable.
alter table public.tests
  add column if not exists course_id uuid;

create index if not exists tests_course_id_idx
  on public.tests(course_id);

-- Every question contributes equally to the final 100-point score.
-- The points column is retained for compatibility but is not used for grading.
create or replace function public.submit_test(
  p_test_id uuid,
  p_student_id uuid,
  p_answers jsonb
)
returns setof public.test_submissions
language plpgsql
security definer
set search_path = public
as $$
declare
  total_questions integer := 0;
  correct_questions integer := 0;
  q record;
  calculated_score numeric;
  new_submission public.test_submissions;
begin
  if exists (
    select 1
    from public.test_submissions ts
    where ts.test_id = p_test_id
      and ts.student_id = p_student_id
  ) then
    raise exception 'You have already submitted this test';
  end if;

  if not exists (
    select 1
    from public.tests t
    where t.id = p_test_id
      and t.published = true
  ) then
    raise exception 'Test is not published or does not exist';
  end if;

  for q in
    select tq.id, tq.correct_answer
    from public.test_questions tq
    where tq.test_id = p_test_id
    order by tq.question_order asc, tq.id asc
  loop
    total_questions := total_questions + 1;

    if upper(trim(coalesce(p_answers ->> q.id::text, ''))) = upper(trim(coalesce(q.correct_answer, ''))) then
      correct_questions := correct_questions + 1;
    end if;
  end loop;

  if total_questions <= 0 then
    calculated_score := 0;
  else
    calculated_score := round(
      (correct_questions::numeric / total_questions::numeric) * 100,
      2
    );
  end if;

  insert into public.test_submissions as ts (
    test_id,
    student_id,
    answers,
    score
  )
  values (
    p_test_id,
    p_student_id,
    coalesce(p_answers, '{}'::jsonb),
    calculated_score
  )
  returning ts.* into new_submission;

  return next new_submission;
  return;

exception
  when unique_violation then
    raise exception 'You have already submitted this test';
end;
$$;

grant execute on function public.submit_test(uuid, uuid, jsonb)
to anon, authenticated;
