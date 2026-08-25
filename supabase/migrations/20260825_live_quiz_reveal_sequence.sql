-- Live quiz reveal sequence support.
-- question_reveal = question only / answers progressively revealed.
-- answering = all answers visible and students may answer.

alter table public.live_quizzes
  add column if not exists question_started_at timestamptz;

create or replace function public.live_quiz_begin_reveal(
  p_quiz_id uuid,
  p_question_index integer
)
returns public.live_quizzes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quiz public.live_quizzes;
begin
  update public.live_quizzes
  set current_question = p_question_index,
      status = 'question_reveal',
      question_started_at = now()
  where id = p_quiz_id
  returning * into v_quiz;

  if v_quiz.id is null then
    raise exception 'Live quiz not found';
  end if;

  return v_quiz;
end;
$$;

grant execute on function public.live_quiz_begin_reveal(uuid, integer) to anon, authenticated;

create or replace function public.live_quiz_begin_answering(
  p_quiz_id uuid
)
returns public.live_quizzes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quiz public.live_quizzes;
begin
  update public.live_quizzes
  set status = 'answering',
      question_started_at = now()
  where id = p_quiz_id
    and status = 'question_reveal'
  returning * into v_quiz;

  if v_quiz.id is null then
    raise exception 'Live quiz is not in the reveal phase';
  end if;

  return v_quiz;
end;
$$;

grant execute on function public.live_quiz_begin_answering(uuid) to anon, authenticated;
