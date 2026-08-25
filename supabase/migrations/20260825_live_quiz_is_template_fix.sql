-- Fix missing is_template column used by the Live Quiz maker/selector.
-- Safe to run even if the column already exists.

alter table public.live_quizzes
  add column if not exists is_template boolean not null default false;

-- Existing draft quizzes are reusable templates in the prototype.
update public.live_quizzes
set is_template = true
where status = 'draft'
  and is_template = false;

create index if not exists live_quizzes_teacher_template_idx
  on public.live_quizzes(teacher_id, is_template, status);

select 'Live quiz is_template column is ready!' as status;
