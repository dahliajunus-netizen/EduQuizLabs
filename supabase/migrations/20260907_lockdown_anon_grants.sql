-- Final API grant hardening for browser-facing tables.
-- Keep anonymous access only on deliberately public live-quiz surfaces.
-- RLS still controls authenticated row access.

revoke all on table public.users from anon;
revoke all on table public.teacher_classes from anon;
revoke all on table public.student_classes from anon;
revoke all on table public.tests from anon;
revoke all on table public.test_questions from anon;
revoke all on table public.test_attempts from anon;
revoke all on table public.test_submissions from anon;
revoke all on table public.class_courses from anon;
revoke all on table public.courses from anon;
revoke all on table public.assignments from anon;
revoke all on table public.assignment_submissions from anon;
revoke all on table public.materials from anon;

-- Security-sensitive assessment RPCs are server-only. The Next.js API performs
-- authentication and authorization before invoking them with the secret key.
revoke all on function public.start_test_attempt(uuid, uuid) from public, anon, authenticated;
grant execute on function public.start_test_attempt(uuid, uuid) to service_role;

revoke all on function public.submit_test_attempt(uuid, uuid, jsonb, boolean) from public, anon, authenticated;
grant execute on function public.submit_test_attempt(uuid, uuid, jsonb, boolean) to service_role;

revoke all on function public.check_assessment_password_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.check_assessment_password_rate_limit(text, integer, integer) to service_role;
