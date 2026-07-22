-- CodeHive · 0001 — extensions and shared helpers

create extension if not exists citext;

-- Maintains updated_at on any table that attaches this trigger.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- The signed-in user's members.id. SECURITY DEFINER so RLS policies on
-- members can call it without recursing into their own policy.
create or replace function public.current_member_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from members where auth_user_id = auth.uid();
$$;

-- True when the signed-in user is an active admin.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from members
    where auth_user_id = auth.uid()
      and role = 'admin'
      and status = 'active'
  );
$$;
