-- Add country to global community chat messages.
alter table public.community_messages
  add column if not exists country text;

update public.community_messages cm
set country = coalesce(nullif(trim(u.country), ''), 'Unknown')
from public.users u
where u.id = cm.user_id
  and (cm.country is null or trim(cm.country) = '');

update public.community_messages
set country = 'Unknown'
where country is null or trim(country) = '';

alter table public.community_messages
  alter column country set default 'Unknown',
  alter column country set not null;
