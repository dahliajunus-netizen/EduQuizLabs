-- EduQuizLabs performance indexes
-- These indexes target the most frequently filtered test/class queries.

create index if not exists idx_test_questions_test_order
  on public.test_questions (test_id, question_order, id);

create index if not exists idx_test_submissions_test_student
  on public.test_submissions (test_id, student_id);

create index if not exists idx_tests_published
  on public.tests (published);

-- test_attempts is used heavily by the student test page and teacher
-- "currently doing" views. These indexes are conditional so they are
-- safe once the attempt table exists with the expected columns.
do $$
begin
  if to_regclass('public.test_attempts') is not null then
    execute 'create index if not exists idx_test_attempts_test_student_status on public.test_attempts (test_id, student_id, status)';
    execute 'create index if not exists idx_test_attempts_started_at on public.test_attempts (started_at)';
  end if;
end $$;
