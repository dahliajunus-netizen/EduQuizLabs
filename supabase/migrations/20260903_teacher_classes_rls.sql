-- Fix teacher class creation and management through Supabase Auth.
-- teacher_classes.teacher_id is the authenticated user's public.users id.

alter table public.teacher_classes enable row level security;

drop policy if exists "Teachers can view their own classes" on public.teacher_classes;
create policy "Teachers can view their own classes"
on public.teacher_classes
for select
to authenticated
using (teacher_id = auth.uid());

drop policy if exists "Teachers can create their own classes" on public.teacher_classes;
create policy "Teachers can create their own classes"
on public.teacher_classes
for insert
to authenticated
with check (
  teacher_id = auth.uid()
  and exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and lower(coalesce(u.role, '')) = 'teacher'
  )
);

drop policy if exists "Teachers can update their own classes" on public.teacher_classes;
create policy "Teachers can update their own classes"
on public.teacher_classes
for update
to authenticated
using (teacher_id = auth.uid())
with check (teacher_id = auth.uid());

drop policy if exists "Teachers can delete their own classes" on public.teacher_classes;
create policy "Teachers can delete their own classes"
on public.teacher_classes
for delete
to authenticated
using (teacher_id = auth.uid());
