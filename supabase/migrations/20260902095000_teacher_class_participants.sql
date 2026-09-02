-- Secure teacher-only participant lookup for a class.
-- Returns only student IDs and display names for students who joined
-- the authenticated teacher's class. It does not expose the users table.

create or replace function public.get_class_participants(p_class_code text)
returns table (
  student_id uuid,
  full_name text
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    sc.student_id,
    u.full_name
  from public.student_classes as sc
  join public.users as u
    on u.id = sc.student_id
  where upper(sc.code) = upper(trim(p_class_code))
    and exists (
      select 1
      from public.teacher_classes as tc
      where upper(tc.code) = upper(trim(p_class_code))
        and tc.teacher_id = (select auth.uid())
    )
  order by lower(coalesce(u.full_name, '')) asc;
$$;

revoke execute on function public.get_class_participants(text) from public;
revoke execute on function public.get_class_participants(text) from anon;
grant execute on function public.get_class_participants(text) to authenticated;
