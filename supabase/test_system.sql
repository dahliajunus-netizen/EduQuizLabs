-- EduQuizLabs test system
--
-- This legacy file is intentionally non-operational.
-- Quiz submissions are now handled by the server-only
-- submit_test_attempt() RPC in supabase/migrations/20260904_quiz_concurrency.sql
-- and subsequent security-hardening migrations.

-- Retire the old SECURITY DEFINER submission RPC if it exists.
drop function if exists public.submit_test(uuid, uuid, jsonb);
