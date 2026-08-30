-- Fix teacher test creation RLS.
-- Tests are owned through their class_code, which maps to teacher_classes.code.
-- Keep RLS enabled and only allow authenticated teachers to insert tests
-- for classes they own.

alter table public.tests enable row level security;

drop policy if exists "Teachers can create tests for their classes" on public.tests;
create policy "Teachers can create tests for their classes"
on public.tests
for insert
to authenticated
with check (
  exists (
    select 1
    from public.teacher_classes tc
    join public.users u on u.id = auth.uid()
    where tc.code = tests.class_code
      and tc.teacher_id = auth.uid()
      and lower(coalesce(u.role, '')) = 'teacher'
  )
);

-- Also allow teachers to manage their own tests. These policies do not grant
-- access to tests belonging to another teacher's class.
drop policy if exists "Teachers can view their class tests" on public.tests;
create policy "Teachers can view their class tests"
on public.tests
for select
to authenticated
using (
  exists (
    select 1
    from public.teacher_classes tc
    where tc.code = tests.class_code
      and tc.teacher_id = auth.uid()
  )
);

drop policy if exists "Teachers can update their class tests" on public.tests;
create policy "Teachers can update their class tests"
on public.tests
for update
to authenticated
using (
  exists (
    select 1
    from public.teacher_classes tc
    where tc.code = tests.class_code
      and tc.teacher_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.teacher_classes tc
    where tc.code = tests.class_code
      and tc.teacher_id = auth.uid()
  )
);

drop policy if exists "Teachers can delete their class tests" on public.tests;
create policy "Teachers can delete their class tests"
on public.tests
for delete
to authenticated
using (
  exists (
    select 1
    from public.teacher_classes tc
    where tc.code = tests.class_code
      and tc.teacher_id = auth.uid()
  )
);
