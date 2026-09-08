-- Restore authenticated course-content reads for the course details page.
-- The teacher course page reuses the student course details component, which
-- reads class_courses/materials/assignments directly from PostgREST.
-- Keep RLS enabled and scope access to the teacher's own classes or a
-- student's joined classes.

alter table public.class_courses enable row level security;
alter table public.course_materials enable row level security;
alter table public.course_assignments enable row level security;
alter table public.assignment_submissions enable row level security;

-- ============================================================
-- class_courses
-- ============================================================

drop policy if exists "Teachers can view their own class courses" on public.class_courses;
create policy "Teachers can view their own class courses"
on public.class_courses
for select
to authenticated
using (
  exists (
    select 1
    from public.teacher_classes tc
    where upper(tc.code) = upper(class_courses.class_code)
      and tc.teacher_id = auth.uid()
  )
);

drop policy if exists "Students can view joined class courses" on public.class_courses;
create policy "Students can view joined class courses"
on public.class_courses
for select
to authenticated
using (
  exists (
    select 1
    from public.student_classes sc
    where sc.student_id = auth.uid()
      and upper(sc.code) = upper(class_courses.class_code)
  )
);

-- ============================================================
-- course_materials
-- ============================================================

drop policy if exists "Teachers can view their course materials" on public.course_materials;
create policy "Teachers can view their course materials"
on public.course_materials
for select
to authenticated
using (
  exists (
    select 1
    from public.class_courses cc
    join public.teacher_classes tc
      on upper(tc.code) = upper(cc.class_code)
     and tc.teacher_id = auth.uid()
    where cc.id = course_materials.course_id
  )
);

drop policy if exists "Students can view joined course materials" on public.course_materials;
create policy "Students can view joined course materials"
on public.course_materials
for select
to authenticated
using (
  exists (
    select 1
    from public.class_courses cc
    join public.student_classes sc
      on sc.student_id = auth.uid()
     and upper(sc.code) = upper(cc.class_code)
    where cc.id = course_materials.course_id
  )
);

-- ============================================================
-- course_assignments
-- ============================================================

drop policy if exists "Teachers can view their course assignments" on public.course_assignments;
create policy "Teachers can view their course assignments"
on public.course_assignments
for select
to authenticated
using (
  exists (
    select 1
    from public.class_courses cc
    join public.teacher_classes tc
      on upper(tc.code) = upper(cc.class_code)
     and tc.teacher_id = auth.uid()
    where cc.id = course_assignments.course_id
  )
);

drop policy if exists "Students can view joined course assignments" on public.course_assignments;
create policy "Students can view joined course assignments"
on public.course_assignments
for select
to authenticated
using (
  exists (
    select 1
    from public.class_courses cc
    join public.student_classes sc
      on sc.student_id = auth.uid()
     and upper(sc.code) = upper(cc.class_code)
    where cc.id = course_assignments.course_id
  )
);

-- ============================================================
-- assignment_submissions
-- ============================================================

drop policy if exists "Teachers can view their assignment submissions" on public.assignment_submissions;
create policy "Teachers can view their assignment submissions"
on public.assignment_submissions
for select
to authenticated
using (
  exists (
    select 1
    from public.course_assignments ca
    join public.class_courses cc on cc.id = ca.course_id
    join public.teacher_classes tc
      on upper(tc.code) = upper(cc.class_code)
     and tc.teacher_id = auth.uid()
    where ca.id = assignment_submissions.assignment_id
  )
);

drop policy if exists "Students can view their assignment submissions" on public.assignment_submissions;
create policy "Students can view their assignment submissions"
on public.assignment_submissions
for select
to authenticated
using (student_id = auth.uid());
