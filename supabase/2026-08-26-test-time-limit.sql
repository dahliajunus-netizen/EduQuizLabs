-- Test time-limit support
-- Safe to run even if the column already exists.

ALTER TABLE public.tests
ADD COLUMN IF NOT EXISTS time_limit_minutes integer;

-- NULL = no time limit.
-- When a limit is set, allow 1 minute through 1440 minutes (24 hours).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tests_time_limit_minutes_check'
      AND conrelid = 'public.tests'::regclass
  ) THEN
    ALTER TABLE public.tests
      ADD CONSTRAINT tests_time_limit_minutes_check
      CHECK (time_limit_minutes IS NULL OR (time_limit_minutes >= 1 AND time_limit_minutes <= 1440));
  END IF;
END $$;
