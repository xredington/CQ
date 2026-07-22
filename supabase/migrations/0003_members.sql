-- CodeHive · 0003 — members (also the allowlist), auth linking, Hive views

create table public.members (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  auth_user_id uuid unique references auth.users (id) on delete set null,
  full_name text not null,
  email citext unique not null,
  company text not null,
  designation text,
  industry text check (industry in (
    'banking-financial-services', 'oil-gas', 'government', 'hospitality',
    'healthcare', 'retail', 'manufacturing', 'telecom', 'education',
    'technology', 'other'
  )),
  country text,
  avatar_url text,
  bio text check (char_length(bio) <= 400),
  referred_by uuid references public.members (id),
  joined_event_id uuid references public.events (id),
  role text not null default 'member' check (role in ('member', 'admin')),
  status text not null default 'invited'
    check (status in ('invited', 'active', 'deactivated'))
);

create index members_referred_by_idx on public.members (referred_by);
create index members_email_idx on public.members (email);

create trigger members_set_updated_at
  before update on public.members
  for each row execute function public.set_updated_at();

-- On first successful sign-in, link auth.users.id into members.auth_user_id
-- (matched by email) and flip status from invited to active.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.members
  set auth_user_id = new.id,
      status = case when status = 'invited' then 'active' else status end
  where email = new.email::citext
    and auth_user_id is null;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- Members may edit only their own full_name, designation, bio and avatar_url.
-- Everything else is admin-only; RLS cannot scope columns, so a trigger does.
create or replace function public.enforce_member_self_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() or auth.uid() is null then
    return new; -- admins and service-role/trigger paths may change anything
  end if;
  if new.email is distinct from old.email
    or new.company is distinct from old.company
    or new.industry is distinct from old.industry
    or new.country is distinct from old.country
    or new.referred_by is distinct from old.referred_by
    or new.joined_event_id is distinct from old.joined_event_id
    or new.role is distinct from old.role
    or new.status is distinct from old.status
    or new.auth_user_id is distinct from old.auth_user_id then
    raise exception 'members may only edit their own name, designation, bio and avatar';
  end if;
  return new;
end;
$$;

create trigger members_enforce_self_update
  before update on public.members
  for each row execute function public.enforce_member_self_update();

alter table public.members enable row level security;

create policy "members_select_authenticated" on public.members
  for select to authenticated using (true);

create policy "members_insert_admin" on public.members
  for insert to authenticated with check (public.is_admin());

create policy "members_update_self_or_admin" on public.members
  for update to authenticated
  using (auth_user_id = auth.uid() or public.is_admin())
  with check (auth_user_id = auth.uid() or public.is_admin());

create policy "members_delete_admin" on public.members
  for delete to authenticated using (public.is_admin());

-- The Hive tree: every member with depth and ancestry path.
create view public.hive_tree
with (security_invoker = true)
as
with recursive tree as (
  select id, full_name, company, industry, country, referred_by,
         1 as depth, array[id] as path
  from public.members where referred_by is null
  union all
  select m.id, m.full_name, m.company, m.industry, m.country, m.referred_by,
         t.depth + 1, t.path || m.id
  from public.members m join tree t on m.referred_by = t.id
)
select * from tree;

-- Per-member recruit counts for the admin leaderboard.
create view public.member_recruit_counts
with (security_invoker = true)
as
select m.id as member_id,
       (select count(*) from public.members c where c.referred_by = m.id) as direct_recruits,
       (select count(*) from public.hive_tree t
         where m.id = any (t.path) and t.id <> m.id) as total_downline
from public.members m;
