-- Harden direct client submissions as well as RPC submissions.
-- This makes the database authoritative even if a client bypasses submit_test.

create or replace function public.validate_test_submission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_test public.tests;
  v_question record;
  v_answer text;
  v_total numeric := 0;
  v_earned numeric := 0;
  v_used integer;
  v_max integer;
  v_attempt public.test_attempts;
  v_expected jsonb;
  v_selected jsonb;
  v_type text;
begin
  if new.test_id is null or new.student_id is null then
    raise exception 'Missing test or student id';
  end if;

  -- Serialize submissions for the same student/test so concurrent requests
  -- cannot both pass the max-attempt check.
  perform pg_advisory_xact_lock(hashtextextended(new.test_id::text || ':' || new.student_id::text, 0));

  select * into v_test
  from public.tests
  where id = new.test_id and published = true;

  if not found then
    raise exception 'This test is not published.';
  end if;

  v_max := greatest(coalesce(v_test.max_attempts, 1), 1);

  select count(*)::integer into v_used
  from public.test_submissions
  where test_id = new.test_id and student_id = new.student_id;

  if v_used >= v_max then
    raise exception 'You have used all available attempts for this test.';
  end if;

  select * into v_attempt
  from public.test_attempts
  where test_id = new.test_id
    and student_id = new.student_id
    and status = 'in_progress'
  order by started_at desc
  limit 1;

  if v_attempt.id is not null
     and v_test.time_limit_minutes is not null
     and v_attempt.started_at is not null
     and now() > v_attempt.started_at + make_interval(mins => v_test.time_limit_minutes) then
    -- A timed-out attempt may still be submitted, but it is graded from the
    -- answers supplied at timeout just like an automatic submission.
    null;
  end if;

  for v_question in
    select id, correct_answer, option_a, points, question_type
    from public.test_questions
    where test_id = new.test_id
    order by question_order asc, id asc
  loop
    v_total := v_total + greatest(coalesce(v_question.points, 1), 0);
    v_answer := coalesce(new.answers ->> v_question.id::text, '');
    v_type := lower(replace(replace(coalesce(v_question.question_type, 'multiple_choice'), '-', '_'), ' ', '_'));

    if v_type in ('fill_blank', 'fill_in_blank') then
      if lower(trim(v_answer)) = lower(trim(coalesce(v_question.option_a, ''))) then
        v_earned := v_earned + greatest(coalesce(v_question.points, 1), 0);
      end if;
    elsif v_type = 'matching' then
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
          v_earned := v_earned + greatest(coalesce(v_question.points, 1), 0);
        end if;
      exception when others then
        null;
      end;
    elsif v_type in ('true_false', 'truefalse', 'boolean') then
      if upper(trim(v_answer)) = upper(trim(coalesce(v_question.correct_answer, ''))) then
        v_earned := v_earned + greatest(coalesce(v_question.points, 1), 0);
      end if;
    elsif upper(trim(v_answer)) = upper(trim(coalesce(v_question.correct_answer, ''))) then
      v_earned := v_earned + greatest(coalesce(v_question.points, 1), 0);
    end if;
  end loop;

  if v_total > 0 then
    new.score := round((v_earned / v_total) * 100, 2);
  else
    new.score := 0;
  end if;

  new.submitted_at := coalesce(new.submitted_at, now());
  new.answers := coalesce(new.answers, '{}'::jsonb);

  if v_attempt.id is not null then
    update public.test_attempts
    set answers = new.answers,
        status = 'completed',
        updated_at = now(),
        completed_at = now()
    where id = v_attempt.id;
  end if;

  return new;
end;
$$;

drop trigger if exists validate_test_submission_before_insert on public.test_submissions;
create trigger validate_test_submission_before_insert
before insert on public.test_submissions
for each row execute function public.validate_test_submission();

revoke all on function public.validate_test_submission() from public;
