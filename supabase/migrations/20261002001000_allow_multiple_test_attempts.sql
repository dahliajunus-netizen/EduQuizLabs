-- A student may retry a test when tests.max_attempts > 1.
-- test_submissions is the authoritative attempt count; test_attempts stores
-- each individual in-progress/completed attempt.

alter table public.test_attempts
  drop constraint if exists test_attempts_test_id_student_id_key;

-- Some databases may have the uniqueness implemented as an index instead
-- of the named constraint. Remove that legacy index if it exists.
drop index if exists public.test_attempts_test_id_student_id_key;
