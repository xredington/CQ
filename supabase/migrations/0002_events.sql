-- CodeHive · 0002 — events (PodHive event series)

create table public.events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  city text not null,
  country text not null,
  event_date date not null,
  timezone text not null default 'Asia/Dubai',
  description text,
  cover_image_url text,
  status text not null default 'upcoming'
    check (status in ('upcoming', 'completed', 'cancelled'))
);

create trigger events_set_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

alter table public.events enable row level security;

create policy "events_select_authenticated" on public.events
  for select to authenticated using (true);

create policy "events_insert_admin" on public.events
  for insert to authenticated with check (public.is_admin());

create policy "events_update_admin" on public.events
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "events_delete_admin" on public.events
  for delete to authenticated using (public.is_admin());
