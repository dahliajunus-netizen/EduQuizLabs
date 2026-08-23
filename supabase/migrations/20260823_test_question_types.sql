-- EduQuizLabs: typed test questions
-- Run this migration in Supabase before creating tests with the new question types.

alter table public.test_questions
  add column if not exists question_type text not null default 'multiple_choice',
  add column if not exists answer_data jsonb not null default '{}'::jsonb;

alter table public.test_questions
  drop constraint if exists test_questions_question_type_check;

alter table public.test_questions
  add constraint test_questions_question_type_check
  check (question_type in ('multiple_choice', 'true_false', 'fill_blank', 'matching'));

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
  total_points numeric := 0;
  earned_points numeric := 0;
  calculated_score numeric := 0;
  new_submission public.test_submissions;
  q record;
  supplied text;
  expected jsonb;
  pair record;
  matching_ok boolean;
begin
  if p_test_id is null or p_student_id is null then
    raise exception 'Missing test or student id';
  end if;

  if exists (
    select 1 from public.test_submissions ts
    where ts.test_id = p_test_id and ts.student_id = p_student_id
  ) then
    raise exception 'You have already submitted this test';
  end if;

  if not exists (
    select 1 from public.tests t
    where t.id = p_test_id and t.published = true
  ) then
    raise exception 'Test is not published or does not exist';
  end if;

  for q in
    select tq.id, tq.question_type, tq.answer_data, tq.correct_answer, tq.points
    from public.test_questions tq
    where tq.test_id = p_test_id
    order by tq.question_order asc, tq.id asc
  loop
    total_points := total_points + greatest(coalesce(q.points, 0), 0);
    supplied := coalesce(p_answers ->> q.id::text, '');

    if coalesce(q.question_type, 'multiple_choice') = 'fill_blank' then
      if exists (
        select 1
        from jsonb_array_elements_text(coalesce(q.answer_data -> 'acceptedAnswers', '[]'::jsonb)) a(value)
        where lower(trim(a.value)) = lower(trim(supplied))
      ) then
        earned_points := earned_points + greatest(coalesce(q.points, 0), 0);
      end if;

    elsif coalesce(q.question_type, 'multiple_choice') = 'matching' then
      matching_ok := true;
      begin
        expected := supplied::jsonb;
      exception when others then
        expected := '{}'::jsonb;
        matching_ok := false;
      end;

      if matching_ok then
        for pair in
          select value->>'left' as left_value, value->>'right' as right_value
          from jsonb_array_elements(coalesce(q.answer_data -> 'pairs', '[]'::jsonb))
        loop
          if coalesce(expected ->> pair.left_value, '') <> coalesce(pair.right_value, '') then
            matching_ok := false;
            exit;
          end if;
        end loop;

        if jsonb_object_length(expected) <> jsonb_array_length(coalesce(q.answer_data -> 'pairs', '[]'::jsonb)) then
          matching_ok := false;
        end if;
      end if;

      if matching_ok then
        earned_points := earned_points + greatest(coalesce(q.points, 0), 0);
      end if;

    else
      if upper(trim(supplied)) = upper(trim(coalesce(q.correct_answer, ''))) then
        earned_points := earned_points + greatest(coalesce(q.points, 0), 0);
      end if;
    end if;
  end loop;

  if total_points > 0 then
    calculated_score := least(100, round((earned_points / total_points) * 100, 2));
  end if;

  insert into public.test_submissions as ts (
    test_id, student_id, answers, score
  ) values (
    p_test_id, p_student_id, coalesce(p_answers, '{}'::jsonb), calculated_score
  ) returning ts.* into new_submission;

  return next new_submission;
  return;
exception
  when unique_violation then
    raise exception 'You have already submitted this test';
end;
$$;

grant execute on function public.submit_test(uuid, uuid, jsonb) to anon, authenticated;
