-- CodeHive · 0004 — event RSVPs and admin-recorded attendance

create table public.event_rsvps (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event_id uuid not null references public.events (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  status text not null check (status in ('going', 'not_going')),
  unique (event_id, member_id)
);

alter table public.event_rsvps enable row level security;

create policy "event_rsvps_select_authenticated" on public.event_rsvps
  for select to authenticated using (true);

create policy "event_rsvps_insert_self" on public.event_rsvps
  for insert to authenticated with check (member_id = public.current_member_id());

create policy "event_rsvps_update_self" on public.event_rsvps
  for update to authenticated
  using (member_id = public.current_member_id())
  with check (member_id = public.current_member_id());

create policy "event_rsvps_delete_self" on public.event_rsvps
  for delete to authenticated using (member_id = public.current_member_id());

create table public.event_attendance (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event_id uuid not null references public.events (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  unique (event_id, member_id)
);

alter table public.event_attendance enable row level security;

create policy "event_attendance_select_admin" on public.event_attendance
  for select to authenticated using (public.is_admin());

create policy "event_attendance_insert_admin" on public.event_attendance
  for insert to authenticated with check (public.is_admin());

create policy "event_attendance_update_admin" on public.event_attendance
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "event_attendance_delete_admin" on public.event_attendance
  for delete to authenticated using (public.is_admin());

-- Members see past-event attendee counts without row access.
create or replace function public.event_attendee_count(p_event_id uuid)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select count(*) from public.event_attendance where event_id = p_event_id;
$$;
