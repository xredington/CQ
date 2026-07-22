-- CodeHive · one-shot database setup (part 1 of 2: schema + RLS + seed)
-- Generated from supabase/migrations 0001-0007 + seed.sql. Paste into the
-- Supabase SQL Editor and Run. Safe on a fresh project only.

-- ═══ supabase/migrations/0001_extensions_and_helpers.sql ═══
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

-- ═══ supabase/migrations/0002_events.sql ═══
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

-- ═══ supabase/migrations/0003_members.sql ═══
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

-- ═══ supabase/migrations/0004_event_rsvps_attendance.sql ═══
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

-- ═══ supabase/migrations/0005_solutions_interests.sql ═══
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

-- ═══ supabase/migrations/0006_posts_replies_likes.sql ═══
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

-- ═══ supabase/migrations/0007_spotlights.sql ═══
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

-- ═══ supabase/seed.sql ═══
-- CodeHive seed data — entirely fictional people and companies.
-- 14 community members (3-level referral chains, 2 roots) + 1 Redington admin,
-- 4 events, 6 published solutions, 8 posts with replies and likes, 3 spotlights.

-- ── Events ──────────────────────────────────────────────────────────────────
insert into public.events (id, name, city, country, event_date, timezone, description, status) values
  ('e0000000-0000-4000-8000-000000000001', 'PodHive Mumbai', 'Mumbai', 'India', '2025-09-18', 'Asia/Kolkata',
   'The first PodHive gathering — 40 technology leaders on real Copilot rollouts, wins and scars.', 'completed'),
  ('e0000000-0000-4000-8000-000000000002', 'PodHive Dubai', 'Dubai', 'UAE', '2025-11-06', 'Asia/Dubai',
   'An evening on AI in regulated industries: banking, government and energy leaders compare notes.', 'completed'),
  ('e0000000-0000-4000-8000-000000000003', 'PodHive Riyadh', 'Riyadh', 'KSA', '2026-02-12', 'Asia/Riyadh',
   'Saudi CIOs on Vision-2030 AI programmes — from pilots to production.', 'completed'),
  ('e0000000-0000-4000-8000-000000000004', 'PodHive Nairobi', 'Nairobi', 'Kenya', '2026-09-10', 'Africa/Nairobi',
   'East Africa joins the Hive: fintech and telecom leaders on practical AI adoption.', 'upcoming');

-- ── Members ─────────────────────────────────────────────────────────────────
-- Root A: Anita Rao → 4 direct (Farid, Kavya, Joseph, Deepak),
--         3 second-level (Layla + Omar under Farid, Ritu under Kavya).
-- Root B: Salma → Tariq → Noura (3 levels), Salma → Grace → Amina, Salma → Vikram.
insert into public.members (id, full_name, email, company, designation, industry, country, bio, referred_by, joined_event_id, role, status) values
  ('a0000000-0000-4000-8000-000000000001', 'Anita Rao', 'anita.rao@example.com', 'Meridian Bank', 'CTO',
   'banking-financial-services', 'India',
   'Building the AI-first bank. Cut customer onboarding from 30 days to 3 with Copilot and document intelligence.',
   null, 'e0000000-0000-4000-8000-000000000001', 'member', 'active'),
  ('a0000000-0000-4000-8000-000000000002', 'Farid Al-Mansoori', 'farid.almansoori@example.com', 'Gulfstone Energy', 'CIO',
   'oil-gas', 'UAE',
   'Digital lead for upstream operations. Interested in safety analytics and field-worker Copilot use cases.',
   'a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000002', 'member', 'active'),
  ('a0000000-0000-4000-8000-000000000003', 'Kavya Nair', 'kavya.nair@example.com', 'Lotus Health Group', 'Head of Digital',
   'healthcare', 'India',
   'Running clinical-documentation AI across 12 hospitals. Ask me about physician adoption.',
   'a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001', 'member', 'active'),
  ('a0000000-0000-4000-8000-000000000004', 'Joseph Mwangi', 'joseph.mwangi@example.com', 'Savannah Capital Bank', 'CTO',
   'banking-financial-services', 'Kenya',
   'East Africa banking tech. Bringing the Nairobi cohort into the Hive.',
   'a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000002', 'member', 'active'),
  ('a0000000-0000-4000-8000-000000000005', 'Deepak Sharma', 'deepak.sharma@example.com', 'UrbanBasket Retail', 'CIO',
   'retail', 'India',
   'Omnichannel retail at scale. Currently piloting shelf-analytics vision AI in 60 stores.',
   'a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001', 'member', 'active'),
  ('a0000000-0000-4000-8000-000000000006', 'Layla Haddad', 'layla.haddad@example.com', 'Emirates Municipal Authority', 'Director of Technology',
   'government', 'UAE',
   'Public-sector service transformation. Arabic-language Copilot evaluations underway.',
   'a0000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000002', 'member', 'active'),
  ('a0000000-0000-4000-8000-000000000007', 'Omar Qassim', 'omar.qassim@example.com', 'Pearl Bay Hotels', 'CTO',
   'hospitality', 'Qatar',
   'Guest-experience AI: concierge bots, revenue optimisation, multilingual service.',
   'a0000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000002', 'member', 'invited'),
  ('a0000000-0000-4000-8000-000000000008', 'Ritu Menon', 'ritu.menon@example.com', 'Crestwood University', 'CIO',
   'education', 'India',
   'AI in higher education — admissions triage and research-support copilots.',
   'a0000000-0000-4000-8000-000000000003', 'e0000000-0000-4000-8000-000000000001', 'member', 'active'),
  ('a0000000-0000-4000-8000-000000000009', 'Salma Al-Zahrani', 'salma.alzahrani@example.com', 'Riyadh Digital Authority', 'Chief Digital Officer',
   'government', 'KSA',
   'National digital-services programme. Recruiting the Riyadh chapter of the Hive.',
   null, 'e0000000-0000-4000-8000-000000000003', 'member', 'active'),
  ('a0000000-0000-4000-8000-000000000010', 'Tariq Hassan', 'tariq.hassan@example.com', 'Nile Industrial Works', 'CIO',
   'manufacturing', 'Egypt',
   'Smart-factory programmes: predictive maintenance and quality-inspection vision models.',
   'a0000000-0000-4000-8000-000000000009', 'e0000000-0000-4000-8000-000000000003', 'member', 'active'),
  ('a0000000-0000-4000-8000-000000000011', 'Noura Al-Harbi', 'noura.alharbi@example.com', 'Falcon Telecom', 'VP Technology',
   'telecom', 'KSA',
   'Network-operations AI and contact-centre copilots for 20M subscribers.',
   'a0000000-0000-4000-8000-000000000010', 'e0000000-0000-4000-8000-000000000003', 'member', 'active'),
  ('a0000000-0000-4000-8000-000000000012', 'Grace Wanjiru', 'grace.wanjiru@example.com', 'Baobab Fintech', 'CTO',
   'technology', 'Kenya',
   'Payments infrastructure for East Africa. Contact-centre AI took first response from 4 hours to 12 minutes.',
   'a0000000-0000-4000-8000-000000000009', 'e0000000-0000-4000-8000-000000000003', 'member', 'active'),
  ('a0000000-0000-4000-8000-000000000013', 'Amina Yusuf', 'amina.yusuf@example.com', 'Coral Coast Medical', 'Head of IT',
   'healthcare', 'Kenya',
   'Hospital-group IT lead, evaluating clinical documentation AI for 2027.',
   'a0000000-0000-4000-8000-000000000012', 'e0000000-0000-4000-8000-000000000004', 'member', 'invited'),
  ('a0000000-0000-4000-8000-000000000014', 'Vikram Bhatt', 'vikram.bhatt@example.com', 'Muscat Grand Resorts', 'CIO',
   'hospitality', 'Oman',
   'Resort-group technology: booking-flow AI and back-office Copilot rollout.',
   'a0000000-0000-4000-8000-000000000009', 'e0000000-0000-4000-8000-000000000003', 'member', 'active'),
  ('a0000000-0000-4000-8000-000000000015', 'Priya Raghavan', 'priya.raghavan@redington.example.com', 'Redington SSG', 'Community Lead',
   'technology', 'UAE',
   'Runs CodeHive for the Redington Software Solutions Group.',
   null, null, 'admin', 'active');

-- ── RSVPs (upcoming Nairobi) and attendance (completed events) ─────────────
insert into public.event_rsvps (event_id, member_id, status) values
  ('e0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000004', 'going'),
  ('e0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000012', 'going'),
  ('e0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000013', 'going'),
  ('e0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001', 'going'),
  ('e0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000005', 'not_going'),
  ('e0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000010', 'not_going');

insert into public.event_attendance (event_id, member_id) values
  ('e0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001'),
  ('e0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000003'),
  ('e0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000005'),
  ('e0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000008'),
  ('e0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002'),
  ('e0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000004'),
  ('e0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000006'),
  ('e0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000007'),
  ('e0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001'),
  ('e0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000009'),
  ('e0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000010'),
  ('e0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000011'),
  ('e0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000012'),
  ('e0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000014');

-- ── Solutions ───────────────────────────────────────────────────────────────
insert into public.solutions (id, title, vendor, category, summary, description, outcomes, owner_name, owner_email, status) values
  ('50000000-0000-4000-8000-000000000001', 'Microsoft 365 Copilot rollout accelerator', 'Microsoft', 'copilot',
   'Structured 90-day rollout: readiness, pilot cohorts, adoption analytics and governance for M365 Copilot.',
   E'A packaged programme that takes an organisation from licence purchase to measured adoption.\n\n**What''s included**\n\n- Tenant readiness and data-governance assessment\n- Pilot-cohort selection and champion training\n- Adoption dashboards wired to Viva Insights\n- Prompt libraries per department',
   E'- 68% weekly active usage after 90 days (median across deployments)\n- 51 minutes saved per user per day on drafting and meeting recap\n- Governance sign-off achieved before wave-2 rollout',
   'Rahul Iyer', 'rahul.iyer@redington.example.com', 'published'),
  ('50000000-0000-4000-8000-000000000002', 'GitHub Copilot for engineering teams', 'Microsoft', 'productivity-ai',
   'Enterprise enablement for GitHub Copilot: policy setup, secure rollout and engineering-velocity measurement.',
   E'Rollout blueprint for regulated enterprises adopting GitHub Copilot.\n\n- IP-indemnity and policy configuration\n- Secure-coding guardrails and audit trails\n- Velocity baselining and quarterly impact reviews',
   E'- 30–40% faster completion of routine coding tasks\n- Pull-request cycle time down 22%\n- Developer-satisfaction scores up across all pilots',
   'Meera Pillai', 'meera.pillai@redington.example.com', 'published'),
  ('50000000-0000-4000-8000-000000000003', 'Microsoft Security Copilot deployment', 'Microsoft', 'security-ai',
   'SOC augmentation with Security Copilot: incident summarisation, guided response and analyst upskilling.',
   E'Deploys Security Copilot into an existing SOC with Sentinel integration.\n\n- Promptbook development for tier-1 triage\n- Sentinel and Defender XDR data connections\n- Analyst enablement and measured MTTR baselines',
   E'- Mean time to respond down 44% in the first quarter\n- Tier-1 triage effort halved\n- Incident reports generated in minutes, not hours',
   'Ahmed Shafiq', 'ahmed.shafiq@redington.example.com', 'published'),
  ('50000000-0000-4000-8000-000000000004', 'Azure AI document intelligence for onboarding', 'Microsoft', 'data-analytics',
   'KYC and onboarding automation: extract, validate and route documents with Azure AI Document Intelligence.',
   E'The pattern behind the "30 days to 3 days" story. Automates document-heavy onboarding flows.\n\n- Custom extraction models for local ID and trade documents\n- Human-in-the-loop validation queues\n- Straight-through processing metrics',
   E'- Customer onboarding time: 30 days → 3 days at a leading bank\n- 92% straight-through processing on standard document sets\n- Compliance review effort down 60%',
   'Rahul Iyer', 'rahul.iyer@redington.example.com', 'published'),
  ('50000000-0000-4000-8000-000000000005', 'Retail shelf-analytics vision AI', 'Redington ISV partner', 'industry-solution',
   'Camera-based shelf monitoring: out-of-stock detection, planogram compliance and promo execution tracking.',
   E'An ISV-built vision solution tuned for Middle East and India retail formats.\n\n- Works with existing CCTV where coverage allows\n- Out-of-stock alerts to store-ops apps within minutes\n- Planogram-compliance scoring per aisle',
   E'- On-shelf availability up 4.1 points in pilot stores\n- Promo-execution compliance up from 71% to 93%\n- Payback inside two quarters at 60-store scale',
   'Meera Pillai', 'meera.pillai@redington.example.com', 'published'),
  ('50000000-0000-4000-8000-000000000006', 'Azure landing zone for AI workloads', 'Microsoft', 'infrastructure',
   'Production-grade Azure foundation for AI: identity, networking, cost guardrails and model-endpoint governance.',
   E'Gets AI workloads out of proof-of-concept subscriptions and into a governed platform.\n\n- Hub-spoke landing zone with private endpoints for Azure OpenAI\n- FinOps guardrails and per-workload cost allocation\n- Model-endpoint catalogue with access reviews',
   E'- POC-to-production time cut from months to weeks\n- Zero public model endpoints across the estate\n- Cloud AI spend visible per business unit',
   'Ahmed Shafiq', 'ahmed.shafiq@redington.example.com', 'published');

-- A couple of warm leads for the admin interests table.
insert into public.solution_interests (solution_id, member_id, note) values
  ('50000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000004',
   'We want the onboarding pattern for retail-banking KYC in Kenya — regulator-ready audit trail is the key question.'),
  ('50000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000014', null),
  ('50000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000011',
   'SOC of 14 analysts, Sentinel already deployed. Interested in a scoped pilot.');

-- ── Posts, replies, likes ───────────────────────────────────────────────────
insert into public.posts (id, author_id, title, body, category, is_pinned, created_at) values
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000015',
   'Welcome to CodeHive — start here',
   E'Welcome to the Hive. This is the private space for PodHive alumni to share what''s actually working.\n\n**House rules**\n\n- Share real numbers where you can\n- No vendor pitches — this is a peer room\n- Grow your Hive: bring in leaders you rate\n\nIntroduce yourself in a reply below.',
   'general', true, now() - interval '90 days'),
  ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001',
   'How we cut customer onboarding from 30 days to 3',
   E'Full write-up of our onboarding transformation at Meridian.\n\nThe stack: Azure AI Document Intelligence for extraction, a human-in-the-loop queue for exceptions, and Copilot drafting the relationship-manager summaries.\n\nHappy to go deep on the compliance sign-off process — that was the hard part, not the tech.',
   'ai-use-cases', false, now() - interval '30 days'),
  ('b0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000003',
   'Physician adoption of clinical Copilot — what actually moved the needle',
   E'We stalled at 20% weekly usage for two months. Three changes got us to 74%:\n\n- Champions per ward, not per hospital\n- Templates for the five most common note types\n- Publishing time-saved numbers weekly\n\nAsk me anything.',
   'copilot', false, now() - interval '21 days'),
  ('b0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000010',
   'Predictive maintenance: how much history do you really need?',
   E'Vendors keep telling me two years of sensor history minimum. Our oldest lines have eight months of clean data.\n\nAnyone shipped predictive maintenance with less? What accuracy did you actually get at go-live?',
   'implementation-help', false, now() - interval '14 days'),
  ('b0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000012',
   'Contact-centre AI: 4 hours to 12 minutes first response',
   E'Numbers from our Nairobi contact centre after six months:\n\n- First response: 4 hours → 12 minutes\n- Full resolution: 2.1 days → 6 hours\n- CSAT up 18 points\n\nThe unlock was letting the model draft in Swahili and English and routing only low-confidence drafts to agents.',
   'ai-use-cases', false, now() - interval '10 days'),
  ('b0000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000006',
   'Arabic-language Copilot quality — sharing our evaluation set',
   E'We built a 400-prompt Arabic evaluation set for citizen-service scenarios (dialect coverage: Gulf, Levantine, Egyptian).\n\nResults vary a lot by task type. Summarisation is strong; form-filling guidance still needs human review. Happy to share the rubric with anyone testing Arabic scenarios.',
   'copilot', false, now() - interval '7 days'),
  ('b0000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000005',
   'Who owns AI governance in your org?',
   E'Genuine question for the room: where does AI governance sit for you?\n\nWe''ve bounced between risk, IT and a new digital-ethics committee. None of them can veto a business unit that wants to ship. How are you structuring this?',
   'general', false, now() - interval '4 days'),
  ('b0000000-0000-4000-8000-000000000008', 'a0000000-0000-4000-8000-000000000004',
   'Sizing a Security Copilot pilot for a mid-size SOC',
   E'We''re a 9-analyst SOC on Sentinel. Redington proposed a Security Copilot pilot and I want to scope it right.\n\nFor those who''ve deployed: how many SCUs did you provision for the pilot, and what did you measure in the first 30 days?',
   'implementation-help', false, now() - interval '2 days');

insert into public.replies (id, post_id, author_id, body, created_at) values
  -- Welcome thread (4 replies)
  ('c0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
   'Anita from Meridian Bank, Mumbai. Here for the onboarding and document-AI conversations — and to bring more India banking leaders into the Hive.', now() - interval '89 days'),
  ('c0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002',
   'Farid, Gulfstone Energy, Abu Dhabi. Focused on field-operations AI. Good to see familiar faces from PodHive Dubai.', now() - interval '85 days'),
  ('c0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000009',
   'Salma, Riyadh Digital Authority. Building the KSA chapter — say hello if you''re in Riyadh.', now() - interval '80 days'),
  ('c0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000012',
   'Grace from Baobab Fintech, Nairobi. Counting down to PodHive Nairobi in September.', now() - interval '60 days'),
  -- Onboarding thread (3 replies)
  ('c0000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000004',
   'This is exactly our roadmap for next year. How did you handle regulator sign-off on the extraction models?', now() - interval '29 days'),
  ('c0000000-0000-4000-8000-000000000006', 'b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001',
   'We treated the model like any other outsourced process: documented the validation queue as the control, and gave the regulator the exception-rate dashboard. Approval took six weeks.', now() - interval '28 days'),
  ('c0000000-0000-4000-8000-000000000007', 'b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000010',
   'The human-in-the-loop queue design is the transferable part — we''re copying it for quality inspection, different industry entirely.', now() - interval '25 days'),
  -- Physician adoption (3 replies)
  ('c0000000-0000-4000-8000-000000000008', 'b0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000013',
   'Bookmarking this. We''re evaluating clinical documentation for 2027 — would love the template list for the five note types.', now() - interval '20 days'),
  ('c0000000-0000-4000-8000-000000000009', 'b0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000003',
   'Will share the templates in this thread next week. The discharge summary one alone saves 11 minutes per patient.', now() - interval '19 days'),
  ('c0000000-0000-4000-8000-000000000010', 'b0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000008',
   'The champions-per-ward model maps well to faculties in a university. Stealing it for our research-support rollout.', now() - interval '18 days'),
  -- Predictive maintenance (2 replies)
  ('c0000000-0000-4000-8000-000000000011', 'b0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000011',
   'We went live on network equipment with nine months of history. Started with anomaly detection only, added failure prediction at month six. Don''t let perfect data block the start.', now() - interval '13 days'),
  ('c0000000-0000-4000-8000-000000000012', 'b0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000002',
   'Same experience offshore — eight months was enough for the high-frequency sensors. The gap was labelled failure events, not history length.', now() - interval '12 days'),
  -- Contact centre (3 replies)
  ('c0000000-0000-4000-8000-000000000013', 'b0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000007',
   'The low-confidence routing threshold is the detail everyone skips. What confidence cut-off are you using?', now() - interval '9 days'),
  ('c0000000-0000-4000-8000-000000000014', 'b0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000012',
   'We route anything under 0.82 to an agent, and we re-tune monthly against QA scores. Started at 0.9 and relaxed it as trust built.', now() - interval '9 days'),
  ('c0000000-0000-4000-8000-000000000015', 'b0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000014',
   'Would this hold up for hotel-guest messaging? Volumes are lower but the languages are wilder.', now() - interval '8 days'),
  -- Arabic Copilot (2 replies)
  ('c0000000-0000-4000-8000-000000000016', 'b0000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000009',
   'Yes please — send the rubric. We''ll run it against our citizen-services pilot and share results back.', now() - interval '6 days'),
  ('c0000000-0000-4000-8000-000000000017', 'b0000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000011',
   'Interested too. Our contact-centre models see heavy dialect mixing — your dialect coverage split would be useful.', now() - interval '5 days'),
  -- Governance (3 replies)
  ('c0000000-0000-4000-8000-000000000018', 'b0000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000001',
   'Ours reports to the CRO with a standing seat for tech. The veto question is real — we gave the committee a "pause and escalate to exco" power rather than a veto. Used once in a year.', now() - interval '3 days'),
  ('c0000000-0000-4000-8000-000000000019', 'b0000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000006',
   'Government angle: we inherit national AI guidelines, so our committee is mostly about conformance evidence. The structure matters less than who writes the audit trail.', now() - interval '3 days'),
  ('c0000000-0000-4000-8000-000000000020', 'b0000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000010',
   'We put it under the COO. Governance that sits outside delivery becomes a newsletter.', now() - interval '2 days'),
  -- Security Copilot sizing (2 replies)
  ('c0000000-0000-4000-8000-000000000021', 'b0000000-0000-4000-8000-000000000008', 'a0000000-0000-4000-8000-000000000011',
   'We ran the pilot at 3 SCUs for a 14-analyst SOC and measured MTTR plus triage minutes per incident. 30-day numbers were enough to green-light production.', now() - interval '1 day'),
  ('c0000000-0000-4000-8000-000000000022', 'b0000000-0000-4000-8000-000000000008', 'a0000000-0000-4000-8000-000000000015',
   'Ahmed Shafiq owns this solution on our side — I''ll connect you. He has sizing worksheets from three regional deployments.', now() - interval '20 hours');

insert into public.post_likes (post_id, member_id) values
  ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002'),
  ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000003'),
  ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000004'),
  ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000009'),
  ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000010'),
  ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000012'),
  ('b0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001'),
  ('b0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000013'),
  ('b0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000001'),
  ('b0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000004'),
  ('b0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000007'),
  ('b0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000014'),
  ('b0000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000009'),
  ('b0000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000001'),
  ('b0000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000010'),
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000005');

-- ── Spotlights ──────────────────────────────────────────────────────────────
insert into public.spotlights (id, member_id, headline, story_md, metric_label, metric_before, metric_after, status, published_at) values
  ('d0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
   'The bank that onboards customers in three days',
   E'When Anita Rao took over technology at Meridian Bank, opening a corporate account took a month of document ping-pong.\n\n**The problem**\n\nEvery onboarding file crossed six desks. Documents arrived by email, were checked by hand, and one missing signature restarted the clock.\n\n**The build**\n\nHer team put Azure AI Document Intelligence at the front door: every incoming document is extracted, validated and routed automatically, with a human-in-the-loop queue for the 8% that need judgement. Copilot drafts the relationship-manager summary from the verified file.\n\n**The result**\n\nOnboarding now completes in three days. The compliance team — the loudest sceptics — became the pattern''s biggest advocates once the exception dashboard gave them more visibility than the old process ever did.\n\n**What she''d tell a peer**\n\n"Start with the queue design, not the model. The model was the easy part."',
   'Customer onboarding time', '30 days', '3 days', 'published', now() - interval '45 days'),
  ('d0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000012',
   'Twelve-minute first response, in two languages',
   E'Baobab Fintech''s contact centre was drowning: 4-hour first responses and agents copy-pasting between five systems.\n\n**The build**\n\nGrace Wanjiru''s team deployed a drafting model that answers in Swahili and English, wired directly into the ticketing queue. Low-confidence drafts route to agents; everything else ships with one-click review.\n\n**The result**\n\nFirst response fell from 4 hours to 12 minutes, resolution from 2.1 days to 6 hours, and CSAT climbed 18 points. Agent headcount stayed flat while volumes grew 40%.\n\n**What she''d tell a peer**\n\n"Publish the confidence threshold and let your QA team own it. That''s what turned the agents from sceptics into tuners."',
   'First response time', '4 hours', '12 minutes', 'published', now() - interval '20 days'),
  ('d0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000003',
   'Getting 3,000 physicians to actually use clinical AI',
   E'Lotus Health Group''s clinical-documentation Copilot was technically live for months — and stuck at 20% weekly usage.\n\n**The turn**\n\nKavya Nair scrapped the hospital-level champion model and named a champion per ward. Her team shipped templates for the five most common note types and published time-saved numbers every Friday.\n\n**The result**\n\nWeekly usage reached 74% across 12 hospitals. The discharge-summary template alone saves 11 minutes per patient — time that goes back to the bedside.\n\n**What she''d tell a peer**\n\n"Adoption is a ward-by-ward campaign, not a deployment milestone."',
   'Physician weekly usage', '20%', '74%', 'published', now() - interval '8 days');

-- ── Test accounts (for pilot/demo sign-in checks; remove before launch) ─────
insert into public.members (id, full_name, email, company, designation, industry, country, bio, referred_by, joined_event_id, role, status) values
  ('a0000000-0000-4000-8000-000000000101', 'Demo CTO', 'demo.cto@codehive.test', 'Demo Bank', 'CTO',
   'banking-financial-services', 'UAE', 'Test account for sign-in and member-flow checks.',
   'a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000002', 'member', 'active'),
  ('a0000000-0000-4000-8000-000000000102', 'Demo CIO', 'demo.cio@codehive.test', 'Demo Retail Group', 'CIO',
   'retail', 'India', 'Test account for sign-in and member-flow checks.',
   'a0000000-0000-4000-8000-000000000009', 'e0000000-0000-4000-8000-000000000003', 'member', 'active'),
  ('a0000000-0000-4000-8000-000000000103', 'Demo Member', 'demo.member@codehive.test', 'Demo Telecom', 'Head of Digital',
   'telecom', 'Kenya', 'Test account for sign-in and member-flow checks.',
   null, 'e0000000-0000-4000-8000-000000000004', 'member', 'invited');

-- ── Initial admin (stakeholder-provided) and real test inboxes ──────────────
-- Test accounts use Gmail plus-aliases: mail arrives in x.redington@gmail.com.
insert into public.members (id, full_name, email, company, designation, industry, country, bio, referred_by, joined_event_id, role, status) values
  ('a0000000-0000-4000-8000-000000000100', 'Harsh Kank', 'harsh.kank@redingtongroup.com', 'Redington SSG', 'Community Admin',
   'technology', 'India', 'CodeHive administrator.', null, null, 'admin', 'invited'),
  ('a0000000-0000-4000-8000-000000000104', 'Test CTO', 'x.redington+cto@gmail.com', 'Test Bank', 'CTO',
   'banking-financial-services', 'UAE', 'Real-inbox test account (alias of x.redington@gmail.com).',
   'a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000002', 'member', 'invited'),
  ('a0000000-0000-4000-8000-000000000105', 'Test CIO', 'x.redington+cio@gmail.com', 'Test Retail Group', 'CIO',
   'retail', 'India', 'Real-inbox test account (alias of x.redington@gmail.com).',
   'a0000000-0000-4000-8000-000000000009', 'e0000000-0000-4000-8000-000000000003', 'member', 'invited'),
  ('a0000000-0000-4000-8000-000000000106', 'Test Member', 'x.redington+member@gmail.com', 'Test Telecom', 'Head of Digital',
   'telecom', 'Kenya', 'Real-inbox test account (alias of x.redington@gmail.com).',
   null, 'e0000000-0000-4000-8000-000000000004', 'member', 'invited');
