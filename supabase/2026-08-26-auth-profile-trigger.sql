-- Run this once in Supabase SQL Editor.
-- It creates the public.users profile automatically whenever Supabase Auth creates a user.
-- Passwords remain inside Supabase Auth and are NOT copied into public.users.

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (
    id,
    full_name,
    email,
    age,
    birthday,
    country,
    role
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email,
    nullif(new.raw_user_meta_data ->> 'age', '')::smallint,
    nullif(new.raw_user_meta_data ->> 'birthday', '')::date,
    coalesce(new.raw_user_meta_data ->> 'country', ''),
    case
      when lower(coalesce(new.raw_user_meta_data ->> 'role', 'student')) = 'teacher'
        then 'teacher'
      else 'student'
    end
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    email = excluded.email,
    age = excluded.age,
    birthday = excluded.birthday,
    country = excluded.country,
    role = excluded.role;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_auth_user();

-- IMPORTANT:
-- Do NOT re-enable password-based login against public.users.
-- The application now authenticates through Supabase Auth.
-- After the application has been migrated to use authenticated JWTs everywhere,
-- enable RLS on public.users and add policies based on auth.uid().
