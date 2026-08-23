-- Test builder fields required by the course Tests/Test Maker UI.
-- Safe to run more than once.

ALTER TABLE public.tests
  ADD COLUMN IF NOT EXISTS class_code text,
  ADD COLUMN IF NOT EXISTS due_date date;

-- Existing tests can inherit their class code from the related course when available.
UPDATE public.tests t
SET class_code = c.class_code
FROM public.class_courses c
WHERE t.course_id = c.id
  AND t.class_code IS NULL;
