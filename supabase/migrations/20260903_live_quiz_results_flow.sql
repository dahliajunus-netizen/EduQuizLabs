-- Live quiz answer -> results animation -> intermission flow.
-- Run this migration in Supabase SQL Editor.

alter table public.live_quizzes
  add column if not exists question_started_at timestamptz;

alter table public.live_quiz_players
  add column if not exists total_response_time_ms bigint not null default 0,
  add column if not exists correct_answers integer not null default 0;

alter table public.live_quiz_answers
  add column if not exists points_earned integer not null default 0;

alter table public.live_quizzes drop constraint if exists live_quizzes_status_check;
alter table public.live_quizzes
  add constraint live_quizzes_status_check
  check (status in ('lobby','question_reveal','answering','results','intermission','finished'));

create or replace function public.live_quiz_begin_reveal(p_quiz_id uuid, p_question_index integer)
returns setof public.live_quizzes
language sql
security definer
set search_path = public
as $$
  update public.live_quizzes
  set status = 'question_reveal',
      current_question = p_question_index,
      question_started_at = now()
  where id = p_quiz_id
  returning *;
$$;

create or replace function public.live_quiz_begin_answering(p_quiz_id uuid)
returns setof public.live_quizzes
language sql
security definer
set search_path = public
as $$
  update public.live_quizzes
  set status = 'answering',
      question_started_at = now()
  where id = p_quiz_id
  returning *;
$$;

create or replace function public.live_quiz_begin_results(p_quiz_id uuid)
returns setof public.live_quizzes
language sql
security definer
set search_path = public
as $$
  update public.live_quizzes
  set status = 'results',
      question_started_at = now()
  where id = p_quiz_id
  returning *;
$$;

create or replace function public.live_quiz_begin_intermission(p_quiz_id uuid)
returns setof public.live_quizzes
language sql
security definer
set search_path = public
as $$
  update public.live_quizzes
  set status = 'intermission',
      question_started_at = now()
  where id = p_quiz_id
  returning *;
$$;

revoke all on function public.live_quiz_begin_reveal(uuid, integer) from public;
revoke all on function public.live_quiz_begin_answering(uuid) from public;
revoke all on function public.live_quiz_begin_results(uuid) from public;
revoke all on function public.live_quiz_begin_intermission(uuid) from public;
grant execute on function public.live_quiz_begin_reveal(uuid, integer) to authenticated, anon;
grant execute on function public.live_quiz_begin_answering(uuid) to authenticated, anon;
grant execute on function public.live_quiz_begin_results(uuid) to authenticated, anon;
grant execute on function public.live_quiz_begin_intermission(uuid) to authenticated, anon;
