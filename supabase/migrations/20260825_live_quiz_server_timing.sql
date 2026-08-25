-- Server-authoritative timing for live quiz questions.
-- The teacher's question transition records the start time in the database.
-- Students can use this timestamp instead of starting independent local timers.

alter table public.live_quizzes
  add column if not exists question_started_at timestamptz;

create index if not exists live_quizzes_question_started_at_idx
  on public.live_quizzes(question_started_at);

create or replace function public.live_quiz_start_question(
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
      status = 'question',
      question_started_at = now()
  where id = p_quiz_id
  returning * into v_quiz;

  if v_quiz.id is null then
    raise exception 'Live quiz not found';
  end if;

  return v_quiz;
end;
$$;

grant execute on function public.live_quiz_start_question(uuid, integer) to anon, authenticated;

create or replace function public.live_quiz_finish_question(
  p_quiz_id uuid,
  p_next_question_index integer default null
)
returns public.live_quizzes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quiz public.live_quizzes;
begin
  if p_next_question_index is null then
    update public.live_quizzes
    set status = 'finished',
        question_started_at = null
    where id = p_quiz_id
    returning * into v_quiz;
  else
    update public.live_quizzes
    set current_question = p_next_question_index,
        status = 'question',
        question_started_at = now()
    where id = p_quiz_id
    returning * into v_quiz;
  end if;

  if v_quiz.id is null then
    raise exception 'Live quiz not found';
  end if;

  return v_quiz;
end;
$$;

grant execute on function public.live_quiz_finish_question(uuid, integer) to anon, authenticated;

create or replace function public.live_quiz_question_remaining_ms(
  p_quiz_id uuid,
  p_time_limit_seconds integer default 30
)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select greatest(
    0,
    p_time_limit_seconds * 1000
      - greatest(0, floor(extract(epoch from (now() - question_started_at)) * 1000))::integer
  )
  from public.live_quizzes
  where id = p_quiz_id
    and status = 'question'
    and question_started_at is not null;
$$;

grant execute on function public.live_quiz_question_remaining_ms(uuid, integer) to anon, authenticated;
