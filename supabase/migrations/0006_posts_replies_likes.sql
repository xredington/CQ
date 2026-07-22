-- CodeHive · 0006 — discussions: posts, single-level replies, likes

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  author_id uuid not null references public.members (id),
  title text not null check (char_length(title) <= 140),
  body text not null,
  category text not null check (category in (
    'copilot', 'ai-use-cases', 'implementation-help', 'general'
  )),
  is_pinned boolean not null default false,
  is_locked boolean not null default false
);

create index posts_category_idx on public.posts (category);
create index posts_created_at_idx on public.posts (created_at desc);

create trigger posts_set_updated_at
  before update on public.posts
  for each row execute function public.set_updated_at();

alter table public.posts enable row level security;

create policy "posts_select_authenticated" on public.posts
  for select to authenticated using (true);

create policy "posts_insert_self" on public.posts
  for insert to authenticated with check (author_id = public.current_member_id());

create policy "posts_update_own_or_admin" on public.posts
  for update to authenticated
  using (author_id = public.current_member_id() or public.is_admin())
  with check (author_id = public.current_member_id() or public.is_admin());

create policy "posts_delete_own_or_admin" on public.posts
  for delete to authenticated
  using (author_id = public.current_member_id() or public.is_admin());

create table public.replies (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  post_id uuid not null references public.posts (id) on delete cascade,
  author_id uuid not null references public.members (id),
  body text not null
);

create index replies_post_id_idx on public.replies (post_id, created_at);

alter table public.replies enable row level security;

create policy "replies_select_authenticated" on public.replies
  for select to authenticated using (true);

create policy "replies_insert_self_unlocked" on public.replies
  for insert to authenticated
  with check (
    author_id = public.current_member_id()
    and not exists (
      select 1 from public.posts p where p.id = post_id and p.is_locked
    )
  );

create policy "replies_update_own" on public.replies
  for update to authenticated
  using (author_id = public.current_member_id())
  with check (author_id = public.current_member_id());

create policy "replies_delete_own_or_admin" on public.replies
  for delete to authenticated
  using (author_id = public.current_member_id() or public.is_admin());

create table public.post_likes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  post_id uuid not null references public.posts (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  unique (post_id, member_id)
);

alter table public.post_likes enable row level security;

create policy "post_likes_select_authenticated" on public.post_likes
  for select to authenticated using (true);

create policy "post_likes_insert_self" on public.post_likes
  for insert to authenticated with check (member_id = public.current_member_id());

-- no update policy by design (matrix: update = —)

create policy "post_likes_delete_self" on public.post_likes
  for delete to authenticated using (member_id = public.current_member_id());

-- Realtime: thread pages subscribe to replies filtered by post_id.
alter publication supabase_realtime add table public.replies;
