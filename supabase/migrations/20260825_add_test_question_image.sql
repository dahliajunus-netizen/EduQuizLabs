-- Adds an optional image URL for ordinary academic test questions.
-- Run this migration in the Supabase SQL Editor if your database is not
-- automatically applying repository migrations.
alter table public.test_questions
  add column if not exists image_url text;

comment on column public.test_questions.image_url is
  'Optional public image URL displayed with the question.';
