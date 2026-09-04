-- EduQuizLabs / ISIF test schema helpers
-- This legacy file no longer grants or defines a public submission RPC.
-- The active submission path is the server-only submit_test_attempt() RPC.

alter table public.tests
  add column if not exists course_id uuid;

create index if not exists tests_course_id_idx
  on public.tests(course_id);

-- Retire the old SECURITY DEFINER submission function if it was created by
-- an earlier version of this script.
drop function if exists public.submit_test(uuid, uuid, jsonb);
