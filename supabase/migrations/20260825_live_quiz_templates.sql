-- Reusable Live Quiz templates
alter table public.live_quizzes
  add column if not exists is_template boolean not null default false;

alter table public.live_quizzes
  drop constraint if exists live_quizzes_status_check;

alter table public.live_quizzes
  add constraint live_quizzes_status_check
  check (status in ('draft', 'lobby', 'question', 'finished'));

-- Templates do not need a game code until launched. Existing rows keep theirs.
alter table public.live_quizzes
  alter column game_code drop not null;

-- A template can be selected by its owner; prototype policies remain permissive.
create index if not exists live_quizzes_template_idx
  on public.live_quizzes(is_template, teacher_id, status);
