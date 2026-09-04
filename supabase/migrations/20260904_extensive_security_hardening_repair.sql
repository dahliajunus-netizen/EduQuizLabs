-- Follow-up repair for 20260904_extensive_security_hardening.sql.
-- Safe to run after the main extensive-hardening migration.

-- 1) Prevent the public Live Quiz question view from exposing future questions.
drop view if exists public.live_quiz_public_questions;

create view public.live_quiz_public_questions
with (security_barrier = true)
as
select
  q.id,
  q.quiz_id,
  q.question_order,
  q.question,
  q.option_a,
  q.option_b,
  q.option_c,
  q.option_d,
  q.time_limit_seconds
from public.live_quiz_questions q
join public.live_quizzes lq on lq.id = q.quiz_id
where lq.status <> 'draft'
  and q.question_order <= lq.current_question;

grant select on public.live_quiz_public_questions to anon, authenticated;

-- 2) Repair duplicate authenticated player identities before adding the
-- unique index. Answers are reassigned to the earliest surviving player so
-- existing quiz history is not silently lost.
with ranked as (
  select
    id,
    quiz_id,
    student_id,
    first_value(id) over (
      partition by quiz_id, student_id
      order by joined_at asc, id asc
    ) as keeper,
    row_number() over (
      partition by quiz_id, student_id
      order by joined_at asc, id asc
    ) as rn
  from public.live_quiz_players
  where student_id is not null
), duplicate_map as (
  select id as duplicate_id, keeper
  from ranked
  where rn > 1
)
update public.live_quiz_answers a
set player_id = d.keeper
from duplicate_map d
where a.player_id = d.duplicate_id;

with ranked as (
  select
    id,
    row_number() over (
      partition by quiz_id, student_id
      order by joined_at asc, id asc
    ) as rn
  from public.live_quiz_players
  where student_id is not null
)
delete from public.live_quiz_players p
using ranked r
where p.id = r.id
  and r.rn > 1;

create unique index if not exists live_quiz_players_one_authenticated_identity
on public.live_quiz_players (quiz_id, student_id)
where student_id is not null;

-- 3) Make answer INSERT authorization explicit in addition to the trigger.
create or replace function public.live_quiz_answer_is_allowed(
  p_quiz_id uuid,
  p_question_id uuid,
  p_player_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_player public.live_quiz_players%rowtype;
  v_quiz public.live_quizzes%rowtype;
  v_question public.live_quiz_questions%rowtype;
begin
  select * into v_player
  from public.live_quiz_players
  where id = p_player_id
    and quiz_id = p_quiz_id;
  if not found then return false; end if;

  if auth.role() <> 'service_role'
     and v_player.student_id is not null
     and v_player.student_id <> auth.uid() then
    return false;
  end if;

  select * into v_quiz
  from public.live_quizzes
  where id = p_quiz_id;
  if not found or v_quiz.status <> 'answering' then return false; end if;

  select * into v_question
  from public.live_quiz_questions
  where id = p_question_id
    and quiz_id = p_quiz_id
    and question_order = v_quiz.current_question;
  if not found or v_quiz.question_started_at is null then return false; end if;

  return now() <= v_quiz.question_started_at
    + make_interval(secs => greatest(coalesce(v_question.time_limit_seconds, 30), 1));
end;
$$;

revoke all on function public.live_quiz_answer_is_allowed(uuid, uuid, uuid)
from public, anon, authenticated;

drop policy if exists live_quiz_answers_insert on public.live_quiz_answers;
create policy live_quiz_answers_insert
on public.live_quiz_answers
for insert
to anon, authenticated
with check (
  public.live_quiz_answer_is_allowed(quiz_id, question_id, player_id)
);

-- 4) Guard the important numeric fields at the table level too.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'live_quiz_players_score_nonnegative'
      and conrelid = 'public.live_quiz_players'::regclass
  ) then
    alter table public.live_quiz_players
      add constraint live_quiz_players_score_nonnegative check (score >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'live_quiz_players_correct_nonnegative'
      and conrelid = 'public.live_quiz_players'::regclass
  ) then
    alter table public.live_quiz_players
      add constraint live_quiz_players_correct_nonnegative check (correct_answers >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'live_quiz_players_response_time_nonnegative'
      and conrelid = 'public.live_quiz_players'::regclass
  ) then
    alter table public.live_quiz_players
      add constraint live_quiz_players_response_time_nonnegative check (total_response_time_ms >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'live_quiz_answers_response_time_nonnegative'
      and conrelid = 'public.live_quiz_answers'::regclass
  ) then
    alter table public.live_quiz_answers
      add constraint live_quiz_answers_response_time_nonnegative check (response_time_ms is null or response_time_ms >= 0);
  end if;
end $$;
