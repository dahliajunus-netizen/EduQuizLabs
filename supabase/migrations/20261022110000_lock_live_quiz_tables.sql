-- Lock the live quiz tables to the server.
--
-- Written against the production database as inspected on 2026-10-22. Every
-- live quiz table was readable and writable by anyone holding the public anon
-- key (policies USING (true) / WITH CHECK (true) for public), so anyone could
-- read all correct answers, edit player scores, take over quiz state, and
-- delete questions and templates.
--
-- After the commit "Move teacher live quiz screens onto server routes", no
-- browser code touches these tables: players use /api/student/live-quiz/*,
-- teachers use /api/teacher/live-quiz/*, and all of those use the service key.
--
-- RUN ONLY AFTER deploying that commit, otherwise live quizzes stop working.
-- Players and teachers in a game at that moment may need to reload the page.

begin;

revoke all on table
  public.live_quizzes,
  public.live_quiz_questions,
  public.live_quiz_players,
  public.live_quiz_answers,
  public.live_quiz_templates,
  public.live_quiz_template_questions
from anon, authenticated;

drop policy if exists live_quizzes_select on public.live_quizzes;
drop policy if exists live_quizzes_insert on public.live_quizzes;
drop policy if exists live_quizzes_update on public.live_quizzes;

drop policy if exists live_quiz_questions_select on public.live_quiz_questions;
drop policy if exists live_quiz_questions_insert on public.live_quiz_questions;
drop policy if exists live_quiz_questions_delete_client on public.live_quiz_questions;

drop policy if exists live_quiz_players_select on public.live_quiz_players;
drop policy if exists live_quiz_players_insert on public.live_quiz_players;
drop policy if exists live_quiz_players_update on public.live_quiz_players;

drop policy if exists live_quiz_answers_select on public.live_quiz_answers;

drop policy if exists live_quiz_templates_select on public.live_quiz_templates;
drop policy if exists live_quiz_templates_insert on public.live_quiz_templates;
drop policy if exists live_quiz_templates_update on public.live_quiz_templates;
drop policy if exists live_quiz_templates_delete on public.live_quiz_templates;

drop policy if exists live_quiz_template_questions_select on public.live_quiz_template_questions;
drop policy if exists live_quiz_template_questions_insert on public.live_quiz_template_questions;
drop policy if exists live_quiz_template_questions_delete on public.live_quiz_template_questions;

-- 20261022100000_lock_private_tables.sql left these two open for an analytics
-- component that has since been removed.
revoke execute on function public.live_quiz_answer_distribution(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.live_quiz_question_ranking(uuid, uuid) from public, anon, authenticated;
grant execute on function public.live_quiz_answer_distribution(uuid, uuid) to service_role;
grant execute on function public.live_quiz_question_ranking(uuid, uuid) to service_role;

commit;
