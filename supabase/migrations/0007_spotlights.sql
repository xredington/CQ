-- CodeHive · 0007 — spotlights (the featuring module)

create table public.spotlights (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  member_id uuid not null references public.members (id),
  headline text not null check (char_length(headline) <= 120),
  story_md text not null,
  metric_label text not null,
  metric_before text not null,
  metric_after text not null,
  hero_image_url text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz
);

create trigger spotlights_set_updated_at
  before update on public.spotlights
  for each row execute function public.set_updated_at();

alter table public.spotlights enable row level security;

create policy "spotlights_select_published_or_admin" on public.spotlights
  for select to authenticated
  using (status = 'published' or public.is_admin());

create policy "spotlights_insert_admin" on public.spotlights
  for insert to authenticated with check (public.is_admin());

create policy "spotlights_update_admin" on public.spotlights
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "spotlights_delete_admin" on public.spotlights
  for delete to authenticated using (public.is_admin());
