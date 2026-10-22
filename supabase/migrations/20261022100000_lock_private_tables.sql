-- Lock the class, test and profile tables to the server.
--
-- Written against the production database as inspected on 2026-10-22, where the
-- 20260904_* hardening migrations had not been applied. In that state any
-- signed-in user could, by calling Supabase REST with their own access token:
--   * change their own users.role (e.g. student -> teacher),
--   * read every student's test attempts and submissions (policies USING (true)),
--   * edit any test attempt (test_attempts_update USING (true)), including
--     started_at to dodge time limits,
--   * edit the score on their own test submissions and the grade on their own
--     assignment submissions,
--   * read correct answers in test_questions for tests in their classes.
--
-- The app does not need any of this access. Signed-in browsers hold no Supabase
-- token (auth lives in HttpOnly cookies), and every read and write of these tables
-- goes through Next.js API routes using the service key.
--
-- RUN ONLY AFTER deploying the commit "Read user profiles with the server key",
-- otherwise sign-in breaks.
--
-- Not covered here: live_quiz_* tables. The teacher live quiz page still uses
-- them from the browser with the anon key, so they are locked in a later
-- migration once that page goes through the server.

begin;

revoke all on table
  public.users,
  public.teacher_classes,
  public.student_classes,
  public.tests,
  public.test_questions,
  public.test_attempts,
  public.test_submissions,
  public.class_courses,
  public.course_materials,
  public.course_assignments,
  public.assignment_submissions
from anon, authenticated;

-- Policies that allow everything. They do nothing once the grants above are
-- gone, but are removed so a future grant cannot bring them back into effect.
drop policy if exists "Allow public inserts" on public.users;
drop policy if exists test_attempts_insert on public.test_attempts;
drop policy if exists test_attempts_select on public.test_attempts;
drop policy if exists test_attempts_update on public.test_attempts;
drop policy if exists "Teachers can view test attempts" on public.test_attempts;
drop policy if exists "Teachers can view test submissions" on public.test_submissions;

-- Database functions are server-only, except the two read-only analytics
-- functions the teacher live quiz analytics page calls from the browser.
-- Trigger functions are skipped; triggers do not need EXECUTE grants.
do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      and p.prorettype <> 'trigger'::regtype
      and p.proname not in ('live_quiz_answer_distribution', 'live_quiz_question_ranking')
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', f.signature);
    execute format('grant execute on function %s to service_role', f.signature);
  end loop;
end
$$;

commit;
