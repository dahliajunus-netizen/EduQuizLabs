-- Functional follow-up for the extensive Live Quiz hardening migration.
-- Player creation is lobby-only; secure score recomputation must still be
-- possible while a quiz is answering/results/finished.

create or replace function public.validate_live_quiz_player()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
begin
  select status
  into v_status
  from public.live_quizzes
  where id = new.quiz_id;

  if not found then
    raise exception 'LIVE_QUIZ_NOT_FOUND';
  end if;

  if TG_OP = 'INSERT' then
    if v_status <> 'lobby' then
      raise exception 'LIVE_QUIZ_NOT_JOINABLE';
    end if;

    if new.student_id is not null
       and auth.role() <> 'service_role'
       and new.student_id <> auth.uid() then
      raise exception 'PLAYER_IDENTITY_MISMATCH';
    end if;

    new.nickname := regexp_replace(trim(coalesce(new.nickname, 'Player')), '\s+', ' ', 'g');
    if length(new.nickname) < 1 or length(new.nickname) > 40 then
      raise exception 'INVALID_NICKNAME';
    end if;

    new.score := 0;
    new.correct_answers := 0;
    new.total_response_time_ms := 0;
    new.joined_at := coalesce(new.joined_at, now());
    new.created_at := coalesce(new.created_at, now());
    return new;
  end if;

  -- Updates are only for integrity recomputation. Never let a browser alter
  -- identity or nickname after the player was created.
  if auth.role() <> 'service_role' then
    if auth.uid() is null and new.student_id is not null then
      raise exception 'PLAYER_IDENTITY_MISMATCH';
    end if;

    if new.student_id is distinct from old.student_id
       or new.id is distinct from old.id
       or new.quiz_id is distinct from old.quiz_id
       or new.nickname is distinct from old.nickname then
      raise exception 'Player identity fields cannot be changed.';
    end if;
  end if;

  return new;
end;
$$;
