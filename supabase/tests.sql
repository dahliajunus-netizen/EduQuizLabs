-- Add this function after creating tests, test_questions and test_submissions.

create or replace function public.submit_test(
  p_test_id uuid,
  p_student_id uuid,
  p_answers jsonb
)
returns table (id uuid, test_id uuid, student_id uuid, answers jsonb, score numeric)
language plpgsql security definer set search_path = public
as $$
declare
  total_points numeric := 0;
  earned_points numeric := 0;
  q record;
  calculated_score numeric;
  new_submission public.test_submissions;
begin
  if exists (select 1 from public.test_submissions where test_id = p_test_id and student_id = p_student_id) then
    raise exception 'You have already submitted this test';
  end if;

  if not exists (select 1 from public.tests where id = p_test_id and published = true) then
    raise exception 'Test is not published or does not exist';
  end if;

  for q in select id, correct_answer, points from public.test_questions where test_id = p_test_id loop
    total_points := total_points + greatest(coalesce(q.points, 0), 0);
    if upper(coalesce(p_answers ->> q.id::text, '')) = q.correct_answer then
      earned_points := earned_points + greatest(coalesce(q.points, 0), 0);
    end if;
  end loop;

  if total_points <= 0 then calculated_score := 0;
  else calculated_score := least(100, round((earned_points / total_points) * 100, 2));
  end if;

  insert into public.test_submissions(test_id, student_id, answers, score)
  values (p_test_id, p_student_id, coalesce(p_answers, '{}'::jsonb), calculated_score)
  returning * into new_submission;

  return query select new_submission.id, new_submission.test_id, new_submission.student_id, new_submission.answers, new_submission.score;
exception when unique_violation then
  raise exception 'You have already submitted this test';
end;
$$;

grant execute on function public.submit_test(uuid, uuid, jsonb) to anon, authenticated;
