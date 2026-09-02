-- Prevent clients from submitting or editing test data on behalf of another student.
-- The browser may send a student_id, but the database requires it to match auth.uid().

create or replace function public.enforce_student_test_identity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'service_role' and (auth.uid() is null or auth.uid() <> new.student_id) then
    raise exception 'You can only modify your own test data.';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_student_test_identity() from public;

drop trigger if exists enforce_test_attempt_student_identity on public.test_attempts;
create trigger enforce_test_attempt_student_identity
before insert or update on public.test_attempts
for each row execute function public.enforce_student_test_identity();

drop trigger if exists enforce_test_submission_student_identity on public.test_submissions;
create trigger enforce_test_submission_student_identity
before insert or update on public.test_submissions
for each row execute function public.enforce_student_test_identity();

-- A submission must correspond to an actual in-progress attempt owned by the
-- same student. This prevents bypassing the attempt flow with a raw insert.
create or replace function public.require_test_attempt_for_submission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt_id uuid;
begin
  if auth.role() <> 'service_role' and (auth.uid() is null or auth.uid() <> new.student_id) then
    raise exception 'You can only submit your own test.';
  end if;

  select id into v_attempt_id
  from public.test_attempts
  where test_id = new.test_id
    and student_id = new.student_id
    and status = 'in_progress'
  order by started_at desc
  limit 1;

  if v_attempt_id is null then
    raise exception 'No active test attempt was found.';
  end if;

  return new;
end;
$$;

revoke all on function public.require_test_attempt_for_submission() from public;

drop trigger if exists require_test_attempt_before_submission on public.test_submissions;
create trigger require_test_attempt_before_submission
before insert on public.test_submissions
for each row execute function public.require_test_attempt_for_submission();
