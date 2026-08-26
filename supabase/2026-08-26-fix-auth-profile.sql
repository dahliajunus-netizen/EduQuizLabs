-- Fix Supabase Auth -> public.users signup failures.
-- Supabase Auth owns passwords. public.users.password must therefore be nullable.

alter table public.users
  alter column password drop not null;

create or replace function public.handle_new_user()
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
execute function public.handle_new_user();
