-- Fix student class-code lookup and membership RLS.
-- Students need to resolve a shared class code even though teacher_classes
-- is otherwise restricted to the owning teacher.
create or replace function public.lookup_class_by_code(p_code text)
returns table (
  id uuid,
  code text,
  class_name text,
  school_name text,
  teacher_id uuid
)
language sql
security definer
set search_path = public
as $$
  select tc.id, tc.code, tc.class_name, tc.school_name, tc.teacher_id
  from public.teacher_classes tc
  where upper(trim(tc.code)) = upper(trim(p_code))
  limit 1;
$$;

revoke all on function public.lookup_class_by_code(text) from public;
grant execute on function public.lookup_class_by_code(text) to authenticated;

-- The current student dashboard performs its class-code lookup against
-- teacher_classes directly, so authenticated students must be able to read
-- the class records needed for joining.
drop policy if exists "Students can view classes for joining" on public.teacher_classes;
create policy "Students can view classes for joining"
on public.teacher_classes
for select
to authenticated
using (
  exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and lower(coalesce(u.role, '')) = 'student'
  )
);

drop policy if exists "Students can view their own class memberships" on public.student_classes;
create policy "Students can view their own class memberships"
on public.student_classes
for select
to authenticated
using (student_id = auth.uid());

drop policy if exists "Students can join classes" on public.student_classes;
create policy "Students can join classes"
on public.student_classes
for insert
to authenticated
with check (
  student_id = auth.uid()
  and exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and lower(coalesce(u.role, '')) = 'student'
  )
);
