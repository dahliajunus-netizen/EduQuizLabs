-- Live Quiz answer integrity + per-question reporting support
-- Safe to run after the existing live quiz migrations.

alter table public.live_quiz_answers
  add column if not exists answered_at timestamptz not null default now();

-- A player can submit only one answer for a given question in a live session.
-- Remove accidental duplicates first, keeping the earliest physical row.
delete from public.live_quiz_answers a
using public.live_quiz_answers b
where a.quiz_id = b.quiz_id
  and a.question_id = b.question_id
  and a.player_id = b.player_id
  and a.ctid > b.ctid;

create unique index if not exists live_quiz_answers_one_per_question_idx
  on public.live_quiz_answers(quiz_id, question_id, player_id);

create index if not exists live_quiz_answers_question_results_idx
  on public.live_quiz_answers(quiz_id, question_id, answer, correct, response_time_ms);

create index if not exists live_quiz_answers_player_idx
  on public.live_quiz_answers(player_id, quiz_id, question_id);
