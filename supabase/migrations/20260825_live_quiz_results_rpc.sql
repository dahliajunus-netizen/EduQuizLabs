create or replace function public.live_quiz_answer_distribution(
  p_quiz_id uuid,
  p_question_id uuid
)
returns table (
  answer text,
  answer_count bigint,
  correct_count bigint
)
language sql
security definer
set search_path = public
as $$
  select
    a.answer::text,
    count(*)::bigint as answer_count,
    count(*) filter (where a.correct = true)::bigint as correct_count
  from public.live_quiz_answers a
  where a.quiz_id = p_quiz_id
    and a.question_id = p_question_id
  group by a.answer
  order by a.answer;
$$;

create or replace function public.live_quiz_question_ranking(
  p_quiz_id uuid,
  p_question_id uuid
)
returns table (
  player_id uuid,
  nickname text,
  answer text,
  correct boolean,
  response_time_ms bigint,
  points_earned integer,
  rank bigint
)
language sql
security definer
set search_path = public
as $$
  select
    a.player_id,
    p.nickname::text,
    a.answer::text,
    a.correct,
    a.response_time_ms::bigint,
    a.points_earned,
    row_number() over (
      order by a.correct desc, a.response_time_ms asc, a.answered_at asc
    ) as rank
  from public.live_quiz_answers a
  join public.live_quiz_players p on p.id = a.player_id
  where a.quiz_id = p_quiz_id
    and a.question_id = p_question_id
  order by a.correct desc, a.response_time_ms asc, a.answered_at asc;
$$;

grant execute on function public.live_quiz_answer_distribution(uuid, uuid) to anon, authenticated;
grant execute on function public.live_quiz_question_ranking(uuid, uuid) to anon, authenticated;
