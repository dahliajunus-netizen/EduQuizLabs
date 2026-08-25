alter table public.live_quiz_players
  add column if not exists total_response_time_ms bigint not null default 0,
  add column if not exists correct_answers integer not null default 0;

alter table public.live_quiz_answers
  add column if not exists points_earned integer not null default 0;

create index if not exists live_quiz_players_speed_idx
  on public.live_quiz_players(quiz_id, correct_answers desc, total_response_time_ms asc);
