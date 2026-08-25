-- EduQuizLabs Live Quiz prototype
create table if not exists public.live_quizzes (
  id uuid primary key default gen_random_uuid(),
  class_code text not null,
  teacher_id uuid,
  title text not null,
  game_code text not null unique,
  status text not null default 'lobby' check (status in ('lobby','question','finished')),
  current_question integer not null default -1,
  created_at timestamptz not null default now()
);

create table if not exists public.live_quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.live_quizzes(id) on delete cascade,
  question_order integer not null,
  question text not null,
  option_a text not null,
  option_b text not null,
  option_c text not null,
  option_d text not null,
  correct_answer text not null check (correct_answer in ('A','B','C','D')),
  time_limit_seconds integer not null default 20
);

create table if not exists public.live_quiz_players (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.live_quizzes(id) on delete cascade,
  student_id uuid,
  nickname text not null,
  score integer not null default 0,
  joined_at timestamptz not null default now(),
  unique (quiz_id, nickname)
);

create table if not exists public.live_quiz_answers (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.live_quizzes(id) on delete cascade,
  question_id uuid not null references public.live_quiz_questions(id) on delete cascade,
  player_id uuid not null references public.live_quiz_players(id) on delete cascade,
  answer text not null,
  correct boolean not null default false,
  response_time_ms integer,
  created_at timestamptz not null default now(),
  unique (question_id, player_id)
);

create index if not exists live_quizzes_game_code_idx on public.live_quizzes(game_code);
create index if not exists live_quiz_questions_quiz_idx on public.live_quiz_questions(quiz_id, question_order);
create index if not exists live_quiz_players_quiz_idx on public.live_quiz_players(quiz_id, score desc);
create index if not exists live_quiz_answers_question_idx on public.live_quiz_answers(question_id);

alter table public.live_quizzes enable row level security;
alter table public.live_quiz_questions enable row level security;
alter table public.live_quiz_players enable row level security;
alter table public.live_quiz_answers enable row level security;

drop policy if exists live_quizzes_prototype_all on public.live_quizzes;
drop policy if exists live_quiz_questions_prototype_all on public.live_quiz_questions;
drop policy if exists live_quiz_players_prototype_all on public.live_quiz_players;
drop policy if exists live_quiz_answers_prototype_all on public.live_quiz_answers;

create policy live_quizzes_prototype_all on public.live_quizzes for all using (true) with check (true);
create policy live_quiz_questions_prototype_all on public.live_quiz_questions for all using (true) with check (true);
create policy live_quiz_players_prototype_all on public.live_quiz_players for all using (true) with check (true);
create policy live_quiz_answers_prototype_all on public.live_quiz_answers for all using (true) with check (true);

-- Enable realtime for the prototype. If a project reports that a table is already
-- in the publication, this line can be skipped for that table.
alter publication supabase_realtime add table public.live_quizzes;
alter publication supabase_realtime add table public.live_quiz_questions;
alter publication supabase_realtime add table public.live_quiz_players;
alter publication supabase_realtime add table public.live_quiz_answers;
