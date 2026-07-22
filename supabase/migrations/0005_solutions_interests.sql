-- CodeHive · 0005 — solutions catalogue and interest capture (future ISV seam)

create table public.solutions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title text not null,
  vendor text not null,
  category text not null check (category in (
    'copilot', 'productivity-ai', 'security-ai', 'data-analytics',
    'industry-solution', 'infrastructure', 'other'
  )),
  summary text not null check (char_length(summary) <= 160),
  description text,
  outcomes text,
  logo_url text,
  owner_name text,
  owner_email text,
  status text not null default 'draft' check (status in ('draft', 'published'))
);

create trigger solutions_set_updated_at
  before update on public.solutions
  for each row execute function public.set_updated_at();

alter table public.solutions enable row level security;

create policy "solutions_select_published_or_admin" on public.solutions
  for select to authenticated
  using (status = 'published' or public.is_admin());

create policy "solutions_insert_admin" on public.solutions
  for insert to authenticated with check (public.is_admin());

create policy "solutions_update_admin" on public.solutions
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "solutions_delete_admin" on public.solutions
  for delete to authenticated using (public.is_admin());

create table public.solution_interests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  solution_id uuid not null references public.solutions (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  note text,
  unique (solution_id, member_id)
);

alter table public.solution_interests enable row level security;

create policy "solution_interests_select_self_or_admin" on public.solution_interests
  for select to authenticated
  using (member_id = public.current_member_id() or public.is_admin());

create policy "solution_interests_insert_self" on public.solution_interests
  for insert to authenticated with check (member_id = public.current_member_id());

-- no update policy by design (matrix: update = —)

create policy "solution_interests_delete_self" on public.solution_interests
  for delete to authenticated using (member_id = public.current_member_id());
