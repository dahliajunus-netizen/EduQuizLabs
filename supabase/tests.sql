-- ISIF / EduQuizLabs Tests schema
-- Run this in Supabase SQL Editor before using the Tests pages.

create table if not exists public.tests (
  id uuid primary key default gen_random_uuid(),
  class_code text not null,
  title text not null,
  description text,
  published boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.test_questions (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references public.tests(id) on delete cascade,
  question_order integer not null default 1,
  question text not null,
  option_a text not null,
  option_b text not null,
  option_c text not null,
  option_d text not null,
  correct_answer char(1) not null check (correct_answer in ('A','B','C','D')),
  points integer not null default 1 check (points >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.test_submissions (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references public.tests(id) on delete cascade,
  student_id uuid not null,
  answers jsonb not null default '{}'::jsonb,
  score numeric(6,2) not null default 0 check (score >= 0 and score <= 100),
  created_at timestamptz not null default now()
);

create unique index if not exists test_submissions_one_per_student
  on public.test_submissions(test_id, student_id);

create index if not exists tests_class_code_idx on public.tests(class_code);
create index if not exists test_questions_test_id_idx on public.test_questions(test_id);
create index if not exists test_submissions_test_id_idx on public.test_submissions(test_id);
create index if not exists test_submissions_student_id_idx on public.test_submissions(student_id);

-- The app uses the anon key like the existing assignment pages.
-- If your Supabase project has RLS enabled, add policies appropriate to your auth setup.
