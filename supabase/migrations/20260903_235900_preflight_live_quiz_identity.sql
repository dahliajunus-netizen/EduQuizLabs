-- Preflight for the September 4 Live Quiz hardening migration.
-- This runs before 20260904_extensive_security_hardening.sql so its unique
-- player identity index cannot fail because of legacy duplicate rows.

with ranked as (
  select
    id,
    quiz_id,
    student_id,
    first_value(id) over (
      partition by quiz_id, student_id
      order by joined_at asc, id asc
    ) as keeper,
    row_number() over (
      partition by quiz_id, student_id
      order by joined_at asc, id asc
    ) as rn
  from public.live_quiz_players
  where student_id is not null
), duplicate_map as (
  select id as duplicate_id, keeper
  from ranked
  where rn > 1
)
update public.live_quiz_answers a
set player_id = d.keeper
from duplicate_map d
where a.player_id = d.duplicate_id;

with ranked as (
  select
    id,
    row_number() over (
      partition by quiz_id, student_id
      order by joined_at asc, id asc
    ) as rn
  from public.live_quiz_players
  where student_id is not null
)
delete from public.live_quiz_players p
using ranked r
where p.id = r.id
  and r.rn > 1;

create unique index if not exists live_quiz_players_one_authenticated_identity
on public.live_quiz_players (quiz_id, student_id)
where student_id is not null;
