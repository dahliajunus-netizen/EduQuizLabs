-- Enable Supabase Realtime for the global community chat.
-- The client only subscribes to INSERT events; message writes remain protected by the server API.

grant select on table public.community_messages to anon, authenticated;

 drop policy if exists "Community messages are publicly readable" on public.community_messages;
create policy "Community messages are publicly readable"
  on public.community_messages
  for select
  to anon, authenticated
  using (true);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'community_messages'
  ) then
    alter publication supabase_realtime add table public.community_messages;
  end if;
end
$$;
