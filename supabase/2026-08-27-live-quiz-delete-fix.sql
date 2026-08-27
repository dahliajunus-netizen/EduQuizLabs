-- Fix live quiz template/question deletion through the Supabase REST API.
-- The app uses the public/anon Supabase key and its own current_user identity,
-- so the client-side DELETE requests need an explicit DELETE policy.
-- Existing policies remain intact; this permissive policy adds DELETE capability.

alter table if exists public.live_quiz_questions enable row level security;
alter table if exists public.live_quizzes enable row level security;

DROP POLICY IF EXISTS "live_quiz_questions_delete_client" ON public.live_quiz_questions;
CREATE POLICY "live_quiz_questions_delete_client"
ON public.live_quiz_questions
FOR DELETE
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "live_quizzes_delete_client" ON public.live_quizzes;
CREATE POLICY "live_quizzes_delete_client"
ON public.live_quizzes
FOR DELETE
TO anon, authenticated
USING (true);

-- Also allow the verification SELECTs used by the live-quiz editor.
DROP POLICY IF EXISTS "live_quiz_questions_select_client" ON public.live_quiz_questions;
CREATE POLICY "live_quiz_questions_select_client"
ON public.live_quiz_questions
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "live_quizzes_select_client" ON public.live_quizzes;
CREATE POLICY "live_quizzes_select_client"
ON public.live_quizzes
FOR SELECT
TO anon, authenticated
USING (true);
