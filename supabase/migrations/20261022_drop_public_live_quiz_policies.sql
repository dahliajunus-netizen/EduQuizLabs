-- Remove live quiz policies that are open to everyone holding the public anon key.
--
-- supabase/2026-08-27-live-quiz-delete-fix.sql added SELECT and DELETE policies
-- with USING (true) for anon and authenticated. Postgres ORs permissive policies,
-- so while they exist the hardened policies from 20260904_extensive_security_hardening
-- have no effect: anyone can read every live quiz question including
-- correct_answer, and delete any live quiz or question.
--
-- The player screen now reads through /api/student/live-quiz/state, which never
-- returns correct_answer.
--
-- BEFORE RUNNING: the teacher live quiz page still calls Supabase REST from the
-- browser with the anon key. Check what it relies on first:
--   select tablename, policyname, roles, cmd, qual
--   from pg_policies where tablename like 'live_quiz%';

drop policy if exists "live_quiz_questions_delete_client" on public.live_quiz_questions;
drop policy if exists "live_quizzes_delete_client" on public.live_quizzes;
drop policy if exists "live_quiz_questions_select_client" on public.live_quiz_questions;
drop policy if exists "live_quizzes_select_client" on public.live_quizzes;

-- Prototype policies (FOR ALL USING (true)) from 20260825_live_quizzes.sql, in
-- case the extensive hardening migration was never applied to this database.
drop policy if exists live_quizzes_prototype_all on public.live_quizzes;
drop policy if exists live_quiz_questions_prototype_all on public.live_quiz_questions;
drop policy if exists live_quiz_players_prototype_all on public.live_quiz_players;
drop policy if exists live_quiz_answers_prototype_all on public.live_quiz_answers;
