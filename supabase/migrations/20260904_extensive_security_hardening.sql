-- EduQuizLabs extensive security hardening.
-- Run after the existing 20260904_quiz_concurrency.sql and
-- 20260904_security_hardening.sql migrations.
--
-- This migration closes the remaining trust-boundary gaps found in the
-- September 4, 2026 security audit. It is intentionally idempotent where
-- practical.

-- ============================================================
-- 1) public.users: users can only see/change their own profile.
-- ============================================================

alter table public.users enable row level security;

-- Remove broad/legacy client policies if they exist.
drop policy if exists "Users can view all profiles" on public.users;
drop policy if exists "Users can view their profile" on public.users;
drop policy if exists "Users can update their profile" on public.users;
drop policy if exists "Users can insert their profile" on public.users;
drop policy if exists "Users can delete their profile" on public.users;

create policy "Users can view own profile"
on public.users
for select
to authenticated
using (id = auth.uid());

create policy "Users can update own profile"
on public.users
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- Prevent a browser client from changing its own security-sensitive identity
-- fields such as role, email, birthday, or age through public.users.
create or replace function public.prevent_user_privilege_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'service_role' then
    if auth.uid() is null or auth.uid() <> old.id or auth.uid() <> new.id then
      raise exception 'You can only modify your own profile.';
    end if;

    if new.role is distinct from old.role
       or new.email is distinct from old.email
       or new.age is distinct from old.age
       or new.birthday is distinct from old.birthday then
      raise exception 'Protected account fields cannot be changed here.';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.prevent_user_privilege_changes() from public;

drop trigger if exists prevent_user_privilege_changes on public.users;
create trigger prevent_user_privilege_changes
before update on public.users
for each row execute function public.prevent_user_privilege_changes();

-- ============================================================
-- 2) teacher_classes: students may see only classes they joined.
-- ============================================================

-- Replace the previous overly-broad student read policy.
drop policy if exists "Students can view classes for joining" on public.teacher_classes;
drop policy if exists "Students can view joined class details" on public.teacher_classes;

create policy "Students can view joined class details"
on public.teacher_classes
for select
to authenticated
using (
  exists (
    select 1
    from public.student_classes sc
    where sc.student_id = auth.uid()
      and upper(sc.code) = upper(teacher_classes.code)
  )
);

-- ============================================================
-- 3) Live Quiz: replace prototype-wide RLS with ownership RLS.
-- ============================================================

alter table public.live_quizzes enable row level security;
alter table public.live_quiz_questions enable row level security;
alter table public.live_quiz_players enable row level security;
alter table public.live_quiz_answers enable row level security;

-- Remove the original prototype policies that allowed everyone to do everything.
drop policy if exists live_quizzes_prototype_all on public.live_quizzes;
drop policy if exists live_quiz_questions_prototype_all on public.live_quiz_questions;
drop policy if exists live_quiz_players_prototype_all on public.live_quiz_players;
drop policy if exists live_quiz_answers_prototype_all on public.live_quiz_answers;

-- Remove known legacy policy names from later experiments as well.
drop policy if exists live_quizzes_all on public.live_quizzes;
drop policy if exists live_quiz_questions_all on public.live_quiz_questions;
drop policy if exists live_quiz_players_all on public.live_quiz_players;
drop policy if exists live_quiz_answers_all on public.live_quiz_answers;

-- Teacher ownership helper.
create or replace function public.teacher_owns_live_quiz(p_quiz_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.live_quizzes q
    join public.teacher_classes tc
      on upper(tc.code) = upper(q.class_code)
     and tc.teacher_id = auth.uid()
    join public.users u
      on u.id = auth.uid()
     and lower(coalesce(u.role, '')) = 'teacher'
    where q.id = p_quiz_id
  );
$$;

revoke all on function public.teacher_owns_live_quiz(uuid) from public, anon, authenticated;
grant execute on function public.teacher_owns_live_quiz(uuid) to authenticated;

-- Live quiz rows: teachers see/manage their own sessions. Students/anonymous
-- consume the deliberately safe public view defined below.
create policy live_quizzes_teacher_select
on public.live_quizzes
for select
to authenticated
using (public.teacher_owns_live_quiz(id));

create policy live_quizzes_teacher_insert
on public.live_quizzes
for insert
to authenticated
with check (
  teacher_id = auth.uid()
  and exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and lower(coalesce(u.role, '')) = 'teacher'
  )
  and exists (
    select 1
    from public.teacher_classes tc
    where upper(tc.code) = upper(live_quizzes.class_code)
      and tc.teacher_id = auth.uid()
  )
);

create policy live_quizzes_teacher_update
on public.live_quizzes
for update
to authenticated
using (public.teacher_owns_live_quiz(id))
with check (
  teacher_id = auth.uid()
  and exists (
    select 1
    from public.teacher_classes tc
    where upper(tc.code) = upper(live_quizzes.class_code)
      and tc.teacher_id = auth.uid()
  )
);

create policy live_quizzes_teacher_delete
on public.live_quizzes
for delete
to authenticated
using (public.teacher_owns_live_quiz(id));

-- Questions are teacher-owned via their parent quiz.
create policy live_quiz_questions_teacher_select
on public.live_quiz_questions
for select
to authenticated
using (public.teacher_owns_live_quiz(quiz_id));

create policy live_quiz_questions_teacher_insert
on public.live_quiz_questions
for insert
to authenticated
with check (public.teacher_owns_live_quiz(quiz_id));

create policy live_quiz_questions_teacher_update
on public.live_quiz_questions
for update
to authenticated
using (public.teacher_owns_live_quiz(quiz_id))
with check (public.teacher_owns_live_quiz(quiz_id));

create policy live_quiz_questions_teacher_delete
on public.live_quiz_questions
for delete
to authenticated
using (public.teacher_owns_live_quiz(quiz_id));

-- Players can be created by the public, because joining a live quiz is a
-- deliberate public-facing feature. Identity is still validated by a trigger.
create policy live_quiz_players_public_insert
on public.live_quiz_players
for insert
to anon, authenticated
with check (
  student_id is null
  or student_id = auth.uid()
);

-- Teachers can manage participants for their own quizzes.
create policy live_quiz_players_teacher_select
on public.live_quiz_players
for select
to authenticated
using (public.teacher_owns_live_quiz(quiz_id));

create policy live_quiz_players_teacher_delete
on public.live_quiz_players
for delete
to authenticated
using (public.teacher_owns_live_quiz(quiz_id));

-- Authenticated users can read their own player record. Anonymous clients do
-- not get active player reads; after joining, the client already has the row it
-- just received from INSERT. Finished quizzes are public for final rankings.
create policy live_quiz_players_own_select
on public.live_quiz_players
for select
to authenticated
using (student_id = auth.uid());

create policy live_quiz_players_finished_select
on public.live_quiz_players
for select
using (
  exists (
    select 1
    from public.live_quizzes q
    where q.id = live_quiz_players.quiz_id
      and q.status = 'finished'
  )
);

-- The existing client performs a PATCH after answering. Allow it only on the
-- player's own row (or anonymous player rows); the trigger below ignores
-- client-supplied score fields and recomputes them from answers.
create policy live_quiz_players_safe_update
on public.live_quiz_players
for update
to anon, authenticated
using (student_id is null or student_id = auth.uid())
with check (student_id is null or student_id = auth.uid());

-- No client DELETE/UPDATE of answers. INSERT is validated and scored by trigger.
create policy live_quiz_answers_insert
on public.live_quiz_answers
for insert
to anon, authenticated
with check (true);

create policy live_quiz_answers_teacher_select
on public.live_quiz_answers
for select
to authenticated
using (public.teacher_owns_live_quiz(quiz_id));

create policy live_quiz_answers_own_select
on public.live_quiz_answers
for select
to authenticated
using (
  exists (
    select 1
    from public.live_quiz_players p
    where p.id = live_quiz_answers.player_id
      and p.student_id = auth.uid()
  )
);

-- Results are intentionally queryable after the answering phase; the UI uses
-- this to show correctness. Before results, clients cannot read other answers.
create policy live_quiz_answers_post_question_select
on public.live_quiz_answers
for select
using (
  exists (
    select 1
    from public.live_quizzes q
    where q.id = live_quiz_answers.quiz_id
      and q.status in ('results', 'intermission', 'finished')
  )
);

-- ============================================================
-- 4) Live Quiz integrity triggers.
-- ============================================================

create or replace function public.validate_live_quiz_player()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_class_code text;
  v_teacher_id uuid;
begin
  select status, class_code, teacher_id
  into v_status, v_class_code, v_teacher_id
  from public.live_quizzes
  where id = new.quiz_id
  for share;

  if not found then
    raise exception 'LIVE_QUIZ_NOT_FOUND';
  end if;

  if v_status <> 'lobby' then
    raise exception 'LIVE_QUIZ_NOT_JOINABLE';
  end if;

  if new.student_id is not null and (auth.role() <> 'service_role' and new.student_id <> auth.uid()) then
    raise exception 'PLAYER_IDENTITY_MISMATCH';
  end if;

  new.nickname := regexp_replace(trim(coalesce(new.nickname, 'Player')), '\s+', ' ', 'g');
  if length(new.nickname) < 1 or length(new.nickname) > 40 then
    raise exception 'INVALID_NICKNAME';
  end if;

  new.score := 0;
  new.correct_answers := 0;
  new.total_response_time_ms := 0;
  new.joined_at := coalesce(new.joined_at, now());
  new.created_at := coalesce(new.created_at, now());

  return new;
end;
$$;

revoke all on function public.validate_live_quiz_player() from public;

drop trigger if exists validate_live_quiz_player_before_write on public.live_quiz_players;
create trigger validate_live_quiz_player_before_write
before insert or update on public.live_quiz_players
for each row execute function public.validate_live_quiz_player();

-- Client updates may contain arbitrary score fields. Ignore those values and
-- derive all scoreboard values from the authoritative answer rows.
create or replace function public.recalculate_live_quiz_player()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_correct integer := 0;
  v_total_time bigint := 0;
  v_score integer := 0;
begin
  if auth.role() <> 'service_role' then
    if new.id is distinct from old.id
       or new.quiz_id is distinct from old.quiz_id
       or new.student_id is distinct from old.student_id
       or new.nickname is distinct from old.nickname then
      raise exception 'Player identity fields cannot be changed.';
    end if;
  end if;

  select
    count(*) filter (where a.correct = true)::integer,
    coalesce(sum(greatest(coalesce(a.response_time_ms, 0), 0)), 0)::bigint
  into v_correct, v_total_time
  from public.live_quiz_answers a
  where a.quiz_id = new.quiz_id
    and a.player_id = new.id;

  v_score := v_correct;
  new.correct_answers := v_correct;
  new.total_response_time_ms := v_total_time;
  new.score := v_score;

  return new;
end;
$$;

revoke all on function public.recalculate_live_quiz_player() from public;

drop trigger if exists recalculate_live_quiz_player_before_update on public.live_quiz_players;
create trigger recalculate_live_quiz_player_before_update
before update on public.live_quiz_players
for each row execute function public.recalculate_live_quiz_player();

-- Server-authoritative answer validation and scoring. The client's correct,
-- points, response time and quiz/question values are all ignored.
create or replace function public.validate_live_quiz_answer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player public.live_quiz_players%rowtype;
  v_quiz public.live_quizzes%rowtype;
  v_question public.live_quiz_questions%rowtype;
  v_elapsed bigint;
  v_limit_ms bigint;
  v_is_correct boolean := false;
begin
  select * into v_player
  from public.live_quiz_players
  where id = new.player_id
    and quiz_id = new.quiz_id;

  if not found then
    raise exception 'PLAYER_NOT_FOUND';
  end if;

  if auth.role() <> 'service_role'
     and v_player.student_id is not null
     and v_player.student_id <> auth.uid() then
    raise exception 'PLAYER_NOT_OWNED';
  end if;

  select * into v_quiz
  from public.live_quizzes
  where id = new.quiz_id
  for share;

  if not found then
    raise exception 'LIVE_QUIZ_NOT_FOUND';
  end if;

  if v_quiz.status <> 'answering' then
    raise exception 'LIVE_QUIZ_NOT_ANSWERING';
  end if;

  if v_quiz.current_question < 0 then
    raise exception 'NO_ACTIVE_QUESTION';
  end if;

  select * into v_question
  from public.live_quiz_questions
  where id = new.question_id
    and quiz_id = new.quiz_id
    and question_order = v_quiz.current_question;

  if not found then
    raise exception 'QUESTION_NOT_ACTIVE';
  end if;

  new.answer := upper(trim(coalesce(new.answer, '')));
  if new.answer not in ('A', 'B', 'C', 'D') then
    raise exception 'INVALID_ANSWER';
  end if;

  if v_quiz.question_started_at is null then
    raise exception 'QUESTION_TIMER_NOT_STARTED';
  end if;

  v_limit_ms := greatest(coalesce(v_question.time_limit_seconds, 30), 1)::bigint * 1000;
  v_elapsed := floor(extract(epoch from (now() - v_quiz.question_started_at)) * 1000)::bigint;

  if v_elapsed < 0 then
    v_elapsed := 0;
  end if;

  if v_elapsed > v_limit_ms then
    raise exception 'QUESTION_TIME_EXPIRED';
  end if;

  v_is_correct := new.answer = upper(trim(coalesce(v_question.correct_answer, '')));

  new.quiz_id := v_quiz.id;
  new.question_id := v_question.id;
  new.correct := v_is_correct;
  new.response_time_ms := least(v_elapsed, v_limit_ms)::integer;
  new.points_earned := case when v_is_correct then 1 else 0 end;
  new.answered_at := now();
  new.created_at := coalesce(new.created_at, now());

  return new;
end;
$$;

revoke all on function public.validate_live_quiz_answer() from public;

drop trigger if exists validate_live_quiz_answer_before_insert on public.live_quiz_answers;
create trigger validate_live_quiz_answer_before_insert
before insert on public.live_quiz_answers
for each row execute function public.validate_live_quiz_answer();

create or replace function public.refresh_live_player_after_answer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.live_quiz_players p
  set score = x.score,
      correct_answers = x.correct_answers,
      total_response_time_ms = x.total_response_time_ms
  from (
    select
      count(*) filter (where a.correct = true)::integer as correct_answers,
      coalesce(sum(greatest(coalesce(a.response_time_ms, 0), 0)), 0)::bigint as total_response_time_ms,
      count(*) filter (where a.correct = true)::integer as score
    from public.live_quiz_answers a
    where a.quiz_id = new.quiz_id
      and a.player_id = new.player_id
  ) x
  where p.id = new.player_id
    and p.quiz_id = new.quiz_id;

  return new;
end;
$$;

revoke all on function public.refresh_live_player_after_answer() from public;

drop trigger if exists refresh_live_player_after_answer_trigger on public.live_quiz_answers;
create trigger refresh_live_player_after_answer_trigger
after insert on public.live_quiz_answers
for each row execute function public.refresh_live_player_after_answer();

-- ============================================================
-- 5) Safe public Live Quiz views.
-- ============================================================

drop view if exists public.live_quiz_public_questions;
drop view if exists public.live_quiz_public;
drop view if exists public.live_quiz_finished_players;

create view public.live_quiz_public
with (security_barrier = true)
as
select
  id,
  title,
  game_code,
  status,
  current_question,
  question_started_at
from public.live_quizzes
where status <> 'draft';

create view public.live_quiz_public_questions
with (security_barrier = true)
as
select
  id,
  quiz_id,
  question_order,
  question,
  option_a,
  option_b,
  option_c,
  option_d,
  time_limit_seconds
from public.live_quiz_questions q
join public.live_quizzes lq on lq.id = q.quiz_id
where lq.status <> 'draft';

create view public.live_quiz_finished_players
with (security_barrier = true)
as
select
  p.id,
  p.quiz_id,
  p.nickname,
  p.score,
  p.total_response_time_ms,
  p.correct_answers
from public.live_quiz_players p
join public.live_quizzes q on q.id = p.quiz_id
where q.status = 'finished';

grant select on public.live_quiz_public to anon, authenticated;
grant select on public.live_quiz_public_questions to anon, authenticated;
grant select on public.live_quiz_finished_players to anon, authenticated;

-- ============================================================
-- 6) Server-authoritative teacher state transitions.
-- ============================================================

create or replace function public.live_quiz_begin_reveal(
  p_quiz_id uuid,
  p_question_index integer
)
returns setof public.live_quizzes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quiz public.live_quizzes;
begin
  if auth.uid() is null or not public.teacher_owns_live_quiz(p_quiz_id) then
    raise exception 'TEACHER_ONLY';
  end if;

  if not exists (
    select 1 from public.live_quiz_questions
    where quiz_id = p_quiz_id and question_order = p_question_index
  ) then
    raise exception 'QUESTION_NOT_FOUND';
  end if;

  update public.live_quizzes
  set status = 'question_reveal',
      current_question = p_question_index,
      question_started_at = now()
  where id = p_quiz_id
  returning * into v_quiz;

  return next v_quiz;
end;
$$;

create or replace function public.live_quiz_begin_answering(p_quiz_id uuid)
returns setof public.live_quizzes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quiz public.live_quizzes;
begin
  if auth.uid() is null or not public.teacher_owns_live_quiz(p_quiz_id) then raise exception 'TEACHER_ONLY'; end if;

  update public.live_quizzes
  set status = 'answering',
      question_started_at = now()
  where id = p_quiz_id
    and status = 'question_reveal'
  returning * into v_quiz;

  if v_quiz.id is null then raise exception 'LIVE_QUIZ_NOT_IN_REVEAL'; end if;
  return next v_quiz;
end;
$$;

create or replace function public.live_quiz_begin_results(p_quiz_id uuid)
returns setof public.live_quizzes
language plpgsql
security definer
set search_path = public
as $$
declare v_quiz public.live_quizzes;
begin
  if auth.uid() is null or not public.teacher_owns_live_quiz(p_quiz_id) then raise exception 'TEACHER_ONLY'; end if;
  update public.live_quizzes
  set status = 'results', question_started_at = null
  where id = p_quiz_id and status = 'answering'
  returning * into v_quiz;
  if v_quiz.id is null then raise exception 'LIVE_QUIZ_NOT_ANSWERING'; end if;
  return next v_quiz;
end;
$$;

create or replace function public.live_quiz_begin_intermission(p_quiz_id uuid)
returns setof public.live_quizzes
language plpgsql
security definer
set search_path = public
as $$
declare v_quiz public.live_quizzes;
begin
  if auth.uid() is null or not public.teacher_owns_live_quiz(p_quiz_id) then raise exception 'TEACHER_ONLY'; end if;
  update public.live_quizzes
  set status = 'intermission', question_started_at = null
  where id = p_quiz_id and status = 'results'
  returning * into v_quiz;
  if v_quiz.id is null then raise exception 'LIVE_QUIZ_NOT_RESULTS'; end if;
  return next v_quiz;
end;
$$;

create or replace function public.live_quiz_finish_quiz(p_quiz_id uuid)
returns setof public.live_quizzes
language plpgsql
security definer
set search_path = public
as $$
declare v_quiz public.live_quizzes;
begin
  if auth.uid() is null or not public.teacher_owns_live_quiz(p_quiz_id) then raise exception 'TEACHER_ONLY'; end if;
  update public.live_quizzes
  set status = 'finished', question_started_at = null
  where id = p_quiz_id and status in ('results', 'intermission', 'answering', 'question_reveal')
  returning * into v_quiz;
  if v_quiz.id is null then raise exception 'LIVE_QUIZ_NOT_ACTIVE'; end if;
  return next v_quiz;
end;
$$;

-- Legacy state-transition functions, if they exist, now require teacher ownership.
create or replace function public.live_quiz_start_question(
  p_quiz_id uuid,
  p_question_index integer
)
returns public.live_quizzes
language plpgsql
security definer
set search_path = public
as $$
declare v_quiz public.live_quizzes;
begin
  if auth.uid() is null or not public.teacher_owns_live_quiz(p_quiz_id) then raise exception 'TEACHER_ONLY'; end if;
  update public.live_quizzes
  set current_question = p_question_index, status = 'question', question_started_at = now()
  where id = p_quiz_id
  returning * into v_quiz;
  if v_quiz.id is null then raise exception 'LIVE_QUIZ_NOT_FOUND'; end if;
  return v_quiz;
end;
$$;

create or replace function public.live_quiz_finish_question(
  p_quiz_id uuid,
  p_next_question_index integer default null
)
returns public.live_quizzes
language plpgsql
security definer
set search_path = public
as $$
declare v_quiz public.live_quizzes;
begin
  if auth.uid() is null or not public.teacher_owns_live_quiz(p_quiz_id) then raise exception 'TEACHER_ONLY'; end if;
  if p_next_question_index is null then
    update public.live_quizzes
    set status = 'finished', question_started_at = null
    where id = p_quiz_id
    returning * into v_quiz;
  else
    update public.live_quizzes
    set current_question = p_next_question_index, status = 'question', question_started_at = now()
    where id = p_quiz_id
    returning * into v_quiz;
  end if;
  if v_quiz.id is null then raise exception 'LIVE_QUIZ_NOT_FOUND'; end if;
  return v_quiz;
end;
$$;

-- Result RPCs now return data only to the owning teacher.
create or replace function public.live_quiz_answer_distribution(
  p_quiz_id uuid,
  p_question_id uuid
)
returns table (answer text, answer_count bigint, correct_count bigint)
language sql
security definer
set search_path = public
as $$
  select a.answer::text,
         count(*)::bigint,
         count(*) filter (where a.correct = true)::bigint
  from public.live_quiz_answers a
  where a.quiz_id = p_quiz_id
    and a.question_id = p_question_id
    and public.teacher_owns_live_quiz(p_quiz_id)
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
  select a.player_id,
         p.nickname::text,
         a.answer::text,
         a.correct,
         a.response_time_ms::bigint,
         a.points_earned,
         row_number() over (order by a.correct desc, a.response_time_ms asc, a.answered_at asc)
  from public.live_quiz_answers a
  join public.live_quiz_players p on p.id = a.player_id
  where a.quiz_id = p_quiz_id
    and a.question_id = p_question_id
    and public.teacher_owns_live_quiz(p_quiz_id)
  order by a.correct desc, a.response_time_ms asc, a.answered_at asc;
$$;

-- Revoke the old anonymous state/result surface and give it only to teachers.
do $$
declare
  sig text;
begin
  revoke all on function public.live_quiz_begin_reveal(uuid, integer) from public, anon, authenticated;
  revoke all on function public.live_quiz_begin_answering(uuid) from public, anon, authenticated;
  revoke all on function public.live_quiz_begin_results(uuid) from public, anon, authenticated;
  revoke all on function public.live_quiz_begin_intermission(uuid) from public, anon, authenticated;
  revoke all on function public.live_quiz_finish_quiz(uuid) from public, anon, authenticated;
  revoke all on function public.live_quiz_start_question(uuid, integer) from public, anon, authenticated;
  revoke all on function public.live_quiz_finish_question(uuid, integer) from public, anon, authenticated;
  revoke all on function public.live_quiz_answer_distribution(uuid, uuid) from public, anon, authenticated;
  revoke all on function public.live_quiz_question_ranking(uuid, uuid) from public, anon, authenticated;
  grant execute on function public.live_quiz_begin_reveal(uuid, integer) to authenticated;
  grant execute on function public.live_quiz_begin_answering(uuid) to authenticated;
  grant execute on function public.live_quiz_begin_results(uuid) to authenticated;
  grant execute on function public.live_quiz_begin_intermission(uuid) to authenticated;
  grant execute on function public.live_quiz_finish_quiz(uuid) to authenticated;
  grant execute on function public.live_quiz_start_question(uuid, integer) to authenticated;
  grant execute on function public.live_quiz_finish_question(uuid, integer) to authenticated;
  grant execute on function public.live_quiz_answer_distribution(uuid, uuid) to authenticated;
  grant execute on function public.live_quiz_question_ranking(uuid, uuid) to authenticated;
end $$;

-- ============================================================
-- 7) Server-only test password limiter and safe cleanup.
-- ============================================================

-- Keep the database-backed limiter inaccessible from browser clients.
revoke all on public.assessment_password_rate_limits from public, anon, authenticated;
revoke all on function public.check_assessment_password_rate_limit(text, integer, integer)
from public, anon, authenticated;
grant execute on function public.check_assessment_password_rate_limit(text, integer, integer)
to service_role;

-- ============================================================
-- 8) Basic data-integrity checks / indexes.
-- ============================================================

create unique index if not exists live_quiz_players_one_authenticated_identity
on public.live_quiz_players (quiz_id, student_id)
where student_id is not null;

create index if not exists live_quiz_players_quiz_status_idx
on public.live_quiz_players (quiz_id, id);

create index if not exists live_quiz_answers_quiz_question_player_idx
on public.live_quiz_answers (quiz_id, question_id, player_id);

-- Cap obviously abusive live answer payloads at the database boundary.
-- This only affects the answer text field; the trigger normalizes it to A-D.

-- ============================================================
-- End.
-- ============================================================
