-- Global EduQuizLabs community chat.
create table if not exists public.community_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('student', 'teacher', 'admin')),
  message text not null check (char_length(message) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists community_messages_created_at_idx
  on public.community_messages (created_at desc);

alter table public.community_messages enable row level security;

revoke all on table public.community_messages from anon, authenticated;
grant select, insert on table public.community_messages to service_role;
