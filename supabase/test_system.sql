-- EduQuizLabs test system
-- Supports multiple attempts through tests.max_attempts.

-- IMPORTANT: scoring is based on the number of questions, not the
-- points values stored on individual questions. Every question has equal
-- weight and the complete test is always worth 100 points.
drop index if exists public.test_submissions_test_student_unique;

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
  v_test public.tests;
  v_question record;
  v_answer text;
  v_total_questions integer := 0;
  v_correct_questions integer := 0;
  v_score numeric := 0;
  v_submission public.test_submissions;
  v_attempt public.test_attempts;
  v_max_attempts integer;
  v_used_attempts integer;
  v_question_type text;
  v_expected jsonb;
  v_selected jsonb;
begin
  if p_test_id is null or p_student_id is null then
    raise exception 'Missing test or student id';
  end if;

  select * into v_test from public.tests where id = p_test_id and published = true;
  if not found then raise exception 'This test is not published.'; end if;

  v_max_attempts := greatest(coalesce(v_test.max_attempts, 1), 1);
  select count(*)::integer into v_used_attempts
  from public.test_submissions
  where test_id = p_test_id and student_id = p_student_id;
  if v_used_attempts >= v_max_attempts then
    raise exception 'You have used all available attempts for this test.';
  end if;

  select * into v_attempt from public.test_attempts
  where test_id = p_test_id
    and student_id = p_student_id
    and status = 'in_progress'
  order by started_at desc
  limit 1;

  for v_question in
    select id, correct_answer, option_a, question_type
    from public.test_questions
    where test_id = p_test_id
    order by question_order asc, id asc
  loop
    v_total_questions := v_total_questions + 1;
    v_answer := coalesce(p_answers ->> v_question.id::text, '');
    v_question_type := lower(replace(replace(coalesce(v_question.question_type, 'multiple_choice'), '-', '_'), ' ', '_'));

    if v_question_type in ('fill_blank', 'fill_in_blank') then
      if lower(trim(v_answer)) = lower(trim(coalesce(v_question.option_a, ''))) then
        v_correct_questions := v_correct_questions + 1;
      end if;
    elsif v_question_type = 'matching' then
      begin
        v_expected := coalesce(v_question.option_a, '[]')::jsonb;
        v_selected := coalesce(v_answer, '{}')::jsonb;
        if jsonb_typeof(v_expected) = 'array'
           and jsonb_array_length(v_expected) > 0
           and not exists (
             select 1
             from jsonb_array_elements(v_expected) p
             where coalesce(v_selected ->> (p ->> 'left'), '') <> coalesce(p ->> 'right', '')
           ) then
          v_correct_questions := v_correct_questions + 1;
        end if;
      exception when others then
        null;
      end;
    elsif v_question_type in ('true_false', 'truefalse', 'boolean') then
      if upper(trim(v_answer)) = upper(trim(coalesce(v_question.correct_answer, ''))) then
        v_correct_questions := v_correct_questions + 1;
      end if;
    elsif upper(trim(v_answer)) = upper(trim(coalesce(v_question.correct_answer, ''))) then
      v_correct_questions := v_correct_questions + 1;
    end if;
  end loop;

  -- Every question is worth exactly the same amount.
  -- 20 questions: 1 wrong = 19/20 = 95.
  if v_total_questions > 0 then
    v_score := round((v_correct_questions::numeric / v_total_questions::numeric) * 100, 2);
  end if;

  insert into public.test_submissions (test_id, student_id, score, submitted_at, answers)
  values (p_test_id, p_student_id, v_score, now(), coalesce(p_answers, '{}'::jsonb))
  returning * into v_submission;

  if v_attempt.id is not null then
    update public.test_attempts
    set answers = coalesce(p_answers, '{}'::jsonb),
        status = 'completed',
        updated_at = now(),
        completed_at = now()
    where id = v_attempt.id;
  end if;

  return v_submission;
end;
$$;

revoke all on function public.submit_test(uuid, uuid, jsonb) from public;
