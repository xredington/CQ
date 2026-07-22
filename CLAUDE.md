# CODEHIVE — MASTER BUILD PROMPT
**Version 1.0 · Single source of truth**
---
## 0. Your role
You are the lead full-stack engineer on CodeHive. You build production-grade software, not demos. You follow this brief exactly. Where the brief is silent, you propose a sensible default and ask before implementing anything that touches the schema, auth, or security. You never silently invent features, and you never skip loading, empty, or error states. Treat every screen as something a bank CTO will judge.
---
## 1. What CodeHive is
CodeHive is an **invite-only, private web community platform** run by Redington's Software Solutions Group (SSG) for approximately **140 senior technology leaders** (CTOs, CIOs, heads of digital) of end-customer organizations across the Middle East, Africa, and India. Members were recruited through physical events called **PodHive events** (completed: India, UAE, Saudi Arabia; upcoming: Kenya).
The community's purpose: members share real AI and Microsoft Copilot success stories (e.g., "we cut customer onboarding from 30 days to 3 days"), learn from peers across industries (banking, oil & gas, government, hospitality, retail, healthcare), implement similar solutions in their own organizations, and recruit peers from their industry into the community — each member growing their own "Hive." Redington tracks this referral tree and rewards top recruiters.
**Naming convention (use consistently everywhere):**
- **CodeHive** = the community and this platform.
- **PodHive** = the physical event series.
- **Hive** = an individual member's referral network (the people they brought in).
- Brand line: **"Stacked by Redington"** appears with the CodeHive wordmark.
---
## 2. Locked decisions — do not revisit, do not ask about these
1. **Web only.** Responsive web app. No native mobile app, no PWA install prompts.
2. **Invite-only.** There is no public signup. Ever. Only pre-approved emails can authenticate.
3. **Magic-link auth only.** No passwords, no social login, no OTP codes.
4. **Discussions are threaded (Reddit-style), not live chat.** Posts and replies with realtime updates. No DMs in v1.
5. **Free.** No payments, subscriptions, or billing code anywhere.
6. **Stack:** Next.js (App Router) + TypeScript strict + Tailwind CSS + Supabase (Postgres, Auth, Realtime, Storage) + Vercel.
7. **English UI only** in v1.
---
## 3. Tech stack and dependencies
- **Next.js 14+ (App Router), TypeScript `strict: true`.** Server components by default; client components only where interactivity requires.
- **Tailwind CSS** with a custom token config (see §5). No component libraries (no MUI, no Chakra, no daisyUI). Build a small internal component set: `Button`, `Card`, `Badge`, `Avatar`, `Input`, `Textarea`, `Select`, `Modal`, `Toast`, `Skeleton`, `EmptyState`, `Tabs`.
- **Supabase JS v2** with `@supabase/ssr` for cookie-based sessions in the App Router.
- **Allowed small deps:** `zod` (validation), `react-hook-form`, `date-fns` + `date-fns-tz`, `lucide-react` (icons only). **Any other dependency requires asking first, with a one-line justification.**
- **Migrations:** every schema change is a SQL file in `supabase/migrations/`. Never mutate the database ad hoc.
- **Repo hygiene:** conventional commits (`feat:`, `fix:`, `chore:`), one feature per commit, `.env.example` kept current.
---
## 4. Environment variables
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # server-only. NEVER imported into client code.
NEXT_PUBLIC_APP_URL=              # e.g. https://codehive.example.com — used in magic-link redirects
```
Magic-link redirect URL must be registered in Supabase Auth settings. Default display timezone: **Asia/Dubai**; store all timestamps as `timestamptz` (UTC).
---
## 5. Brand and design system
**Aesthetic direction: boardroom-editorial.** The reference is a premium consulting report, not a SaaS dashboard. Generous whitespace, confident typography, restrained color, no gradients-for-decoration, no glassmorphism, no confetti.
**Provisional design tokens** — build with these now; final brand hexes and logo files are **[DECISION NEEDED]** from the stakeholder and will be swapped via the Tailwind config only:
- `--bg`: deep forest green-black (provisional `#0C1A14`)
- `--surface`: raised card tone (provisional `#12241B`)
- `--ink`: warm off-white (provisional `#F2EFE6`)
- `--ink-muted`: 60% ink
- `--accent`: honey amber (provisional `#E0A82E`) — used sparingly: primary buttons, active states, the signature element
- `--line`: hairline borders at 10–12% ink
**Typography:** a characterful display face for headlines and the wordmark (propose 2–3 options in your first design pass — not Inter, not Playfair) paired with a clean grotesque for body text and a tabular/mono face for metrics. Sentence case throughout the UI.
**Signature element — the honeycomb.** The Hive is the subject, so hexagons are the identity: member avatars are hexagonal (initials fallback on brand surface), the admin Hive tree renders as a honeycomb-style node graph, and section markers use a subtle single hex outline. This is the one place the design takes a risk. Everything else stays quiet and disciplined. Do not add other decorative motifs.
**Non-negotiable quality floor:** every route has a designed loading state (skeletons, not spinners), a designed empty state with a next action, and a designed error state with a retry. Keyboard focus visible everywhere. `prefers-reduced-motion` respected. Fully usable at 375px width. Private platform: send `X-Robots-Tag: noindex` and a `robots.txt` disallowing all.
**UI writing rules:** plain verbs, sentence case, no filler. Buttons say what happens: "Send sign-in link," "Post reply," "Save changes." An action keeps its name through the flow (button "Publish" → toast "Published"). Errors say what went wrong and how to fix it; they never apologize and are never vague.
---
## 6. Authentication and access control
**Flow (implement exactly):**
1. `/login` — CodeHive wordmark, line "Stacked by Redington," sub-line "The private community for AI leaders across the Middle East, Africa and India." One field labeled **Work email**, one button **Send sign-in link**.
2. On submit, a **server action** checks the email against the `members` table (case-insensitive) **before** calling `signInWithOtp`.
   - **On allowlist** → send magic link. Success state: "Check your inbox — your sign-in link is on its way to {email}. It expires in 15 minutes."
   - **Not on allowlist** → do NOT send anything. Show: "CodeHive is invite-only. This email isn't on the member list yet. If you attended a PodHive event, write to **[DECISION NEEDED: contact email]** and we'll get you set up." Never reveal who *is* a member.
3. On first successful sign-in, a Postgres trigger links `auth.users.id` into `members.auth_user_id` (matched by email) and flips `members.status` from `invited` to `active`.
4. Middleware protects every route except `/login`. Signed-out users are redirected to `/login`. Deactivated members (`status = 'deactivated'`) are signed out with: "Your CodeHive access has been paused. Contact the Redington team."
5. **Roles:** `member` and `admin` (column on `members`). Admin routes check role server-side — never trust the client.
---
## 7. Database schema
Write as Supabase migrations. All tables: `id uuid primary key default gen_random_uuid()`, `created_at timestamptz default now()`; add `updated_at` (with trigger) where noted. **Enable RLS on every table before inserting any real data.**
### `members` (also the allowlist)
| column | type | notes |
|---|---|---|
| auth_user_id | uuid, unique, nullable | links to `auth.users`; null until first sign-in |
| full_name | text, not null | |
| email | citext, unique, not null | the allowlist key |
| company | text, not null | |
| designation | text | e.g. "CTO" |
| industry | text | check: `banking-financial-services, oil-gas, government, hospitality, healthcare, retail, manufacturing, telecom, education, technology, other` |
| country | text | e.g. UAE, KSA, India, Kenya, Oman, Qatar, Egypt |
| avatar_url | text | Supabase Storage; hex-crop rendered client-side |
| bio | text | ≤ 400 chars |
| referred_by | uuid → members(id), nullable | **the Hive tree.** Null = root member (recruited directly by Redington/partner) |
| joined_event_id | uuid → events(id), nullable | the PodHive event where they joined |
| role | text default 'member' | check: `member, admin` |
| status | text default 'invited' | check: `invited, active, deactivated` |
| updated_at | timestamptz | |
### `events`
`name` text · `city` text · `country` text · `event_date` date · `timezone` text (IANA) · `description` text · `cover_image_url` text · `status` check `upcoming, completed, cancelled` · `updated_at`.
### `event_rsvps`
`event_id` → events · `member_id` → members · `status` check `going, not_going` · unique `(event_id, member_id)`.
### `event_attendance` (admin-recorded actuals; feeds the Hive metrics)
`event_id` → events · `member_id` → members · unique `(event_id, member_id)`.
### `solutions` (the AI use-case catalogue)
`title` text · `vendor` text (e.g. Microsoft) · `category` check `copilot, productivity-ai, security-ai, data-analytics, industry-solution, infrastructure, other` · `summary` text ≤ 160 chars (card text) · `description` text (markdown) · `outcomes` text (markdown; bullet results) · `logo_url` · `owner_name` text · `owner_email` text (Redington solution owner) · `status` check `draft, published` · `updated_at`.
### `solution_interests` ⭐ the future ISV-lead seam
`solution_id` → solutions · `member_id` → members · `note` text nullable · unique `(solution_id, member_id)`. Every row is a warm lead. Build it now; it wires into the ISV platform later.
### `posts`
`author_id` → members · `title` text ≤ 140 · `body` text (markdown) · `category` check `copilot, ai-use-cases, implementation-help, general` · `is_pinned` bool default false · `is_locked` bool default false · `updated_at`.
### `replies`
`post_id` → posts (cascade delete) · `author_id` → members · `body` text. **Single-level replies in v1** — no nested reply-to-reply. Reply count shown on post cards via view or count query.
### `post_likes`
`post_id` → posts · `member_id` → members · unique `(post_id, member_id)`.
### `spotlights` (the featuring module)
`member_id` → members · `headline` text ≤ 120 · `story_md` text (markdown) · `metric_label` text (e.g. "Customer onboarding time") · `metric_before` text (e.g. "30 days") · `metric_after` text (e.g. "3 days") · `hero_image_url` · `status` check `draft, published` · `published_at` timestamptz.
### Hive tree query (create as a database view `hive_tree`)
```sql
with recursive tree as (
  select id, full_name, company, industry, country, referred_by,
         1 as depth, array[id] as path
  from members where referred_by is null
  union all
  select m.id, m.full_name, m.company, m.industry, m.country, m.referred_by,
         t.depth + 1, t.path || m.id
  from members m join tree t on m.referred_by = t.id
)
select * from tree;
```
Also expose per-member `direct_recruits` and `total_downline` counts for the admin leaderboard.
### RLS policy matrix
| table | select | insert | update | delete |
|---|---|---|---|---|
| members | any authenticated | admin only (service role) | self: `full_name, designation, bio, avatar_url` only; admin: all | admin only |
| events | any authenticated | admin | admin | admin |
| event_rsvps | any authenticated | self | self | self |
| event_attendance | admin | admin | admin | admin |
| solutions | authenticated where `status='published'`; admin: all | admin | admin | admin |
| solution_interests | self + admin | self | — | self |
| posts | any authenticated | self as author | own post; admin any | own post; admin any |
| replies | any authenticated | self (blocked if post `is_locked`) | own reply | own reply; admin any |
| post_likes | any authenticated | self | — | self |
| spotlights | authenticated where `status='published'`; admin: all | admin | admin | admin |
---
## 8. Routes and screens — full specification
### Member-facing
**`/login`** — as specified in §6. Nothing else on this page. No marketing sections.
**`/` Home** — signed-in dashboard. Greeting "Good morning, {first name}" (time-of-day aware, Asia/Dubai). Then, in order: (1) latest published spotlight as a wide hero card — hex portrait, headline, before→after metric rendered large in the tabular face; (2) "Active discussions" — 5 most recently active posts (latest reply time) with title, author, company, category badge, reply count; (3) "Upcoming PodHive events" — next 2 events with city, date, RSVP state; (4) compact stats strip: members, countries, solutions, discussions. Empty states: "No discussions yet — start the first one" linking to `/discussions/new`.
**`/members`** — directory. Search by name/company (debounced 300ms). Filters: industry, country (multi-select chips). Grid of cards: hex avatar, name, designation, company, industry badge, country. Skeleton grid while loading. Empty search state: "No members match — try clearing a filter."
**`/members/[id]`** — profile. Header: hex avatar, name, designation, company, industry, country, member-since. Bio. **"Their Hive"**: members whose `referred_by` = this member (count + cards) — social proof for recruiting. "Recent posts" list. If viewing own profile: "Edit profile" (modal: name, designation, bio, avatar upload to Storage, 2MB max, square-crop guidance).
**`/solutions`** — catalogue. Category filter tabs + search. Cards: logo, title, vendor, 160-char summary, category badge. Only `published`.
**`/solutions/[id]`** — detail. Title, vendor, category, description (rendered markdown), "Outcomes" block styled as results. Primary button: **"I'm interested"** → inserts into `solution_interests` (optional note modal: "Anything specific you're trying to solve?") → button becomes "Interest sent ✓" (state persists via the unique constraint). Confirmation toast: "Noted — the Redington solution owner will reach out."
**`/discussions`** — the Reddit. Sort toggle: **Active** (default, latest reply) / **New** / **Top** (likes). Category filter chips. Pinned posts always first with a pin marker. Post cards: title, author + company, category, relative time ("2h ago"), reply count, like count. Prominent **"Start a discussion"** button.
**`/discussions/new`** — title (140 max, live counter), category select, body textarea with markdown hint ("Bold, lists and links supported"). Buttons: "Post discussion" / "Cancel". Validate with zod; inline errors under fields.
**`/discussions/[id]`** — the thread. Post full-width; like button with count. Replies chronological. Reply composer pinned at bottom (textarea + "Post reply"). **Realtime:** subscribe to Supabase Realtime on `replies` filtered by `post_id` — new replies from others append instantly with a brief highlight; own replies appear optimistically. If `is_locked`: composer replaced by "This discussion is locked." Author sees edit/delete on own content (delete = confirm modal: "Delete this reply? This can't be undone.").
**`/events`** — "Upcoming" and "Past" tabs. Upcoming cards: cover image, name, city + country, date in event-local time, description, RSVP buttons ("I'll be there" / "Can't make it") writing to `event_rsvps`, going-count. Past cards: name, city, date, attendee count from `event_attendance`.
**`/spotlights`** — grid of published spotlights: hero image or hex portrait, headline, member + company, before→after metric. Newest first.
**`/spotlights/[id]`** — editorial story page: large headline, member card, the metric as the visual centerpiece (before → after in the tabular face), `story_md` rendered with comfortable reading measure (~65ch).
### Admin (role-gated, under `/admin`, distinct "Admin" marker in the shell)
**`/admin`** — overview: total members, active vs invited, posts this month, RSVPs for next event, interests captured this month, top 5 recruiters (name + direct + total downline).
**`/admin/hive-tree`** ⭐ the flagship. Renders `hive_tree` as an expandable honeycomb/indented node graph. Root nodes = `referred_by is null`. Each node: hex avatar, name, company, direct-recruit count, total-downline count. Expand/collapse; search jumps to and highlights a member; filter by industry/country/event. Per-node detail popover: joined event, status, downline list. **Leaderboard tab:** members ranked by total downline — this drives the incentive-trip decisions.
**`/admin/members`** — table: name, email, company, industry, country, status, referred_by, role. Add member (modal, all fields — adding = allowlisting). Edit, deactivate/reactivate. **CSV import:** upload → mapping preview → validate (dupes, bad emails, unknown `referred_by`) → import report ("38 added, 2 skipped: duplicate email"). This is how the initial ~140 get loaded.
**`/admin/solutions`, `/admin/events`, `/admin/spotlights`** — CRUD with draft/publish. Spotlight editor: pick member, headline, metric triplet, markdown story, hero upload, live preview matching the public page. Event editor includes an attendance tab (post-event: check off attendees → writes `event_attendance`).
**`/admin/discussions`** — moderation: pin/unpin, lock/unlock, delete (confirm modal). No edit of others' words.
**`/admin/interests`** — table of `solution_interests`: member, company, solution, note, date. Export CSV. (Manual hand-off to solution owners in v1; automation comes with the ISV platform.)
---
## 9. Seed data (required, in `supabase/seed.sql`)
Entirely fictional names — never real members. 14 members forming realistic 3-level referral chains across ≥6 industries and ≥5 countries (2 roots; one root with 4 direct + 3 second-level to make the tree demo well). 1 admin. 3 completed events (Mumbai, Dubai, Riyadh) + 1 upcoming (Nairobi) with RSVPs. 6 published solutions across ≥4 categories. 8 posts across all categories with 2–5 replies each and some likes; 1 pinned. 3 published spotlights — one using the pattern "Customer onboarding time: 30 days → 3 days."
---
## 10. Explicitly out of scope — do not build, do not scaffold
1. Native/mobile apps or PWA installability
2. The ISV onboarding portal (separate platform)
3. Investor community (separate, deliberately blocked)
4. AI COE connector or any external integration (the `solutions` + `solution_interests` schema is the future seam — schema readiness only)
5. Payments/subscriptions
6. Public signup or any self-serve registration
7. Direct messages
8. Email notifications beyond the magic link (digests are Phase 2+)
9. Gamification points/badges (the Hive leaderboard in admin is the only ranking)
10. Multi-language UI
If a task seems to require any of these, stop and ask.
---
## 11. Build sequence and acceptance criteria
**Phase 1 — Foundation.** Repo, Tailwind tokens, component set, Supabase project, all migrations + RLS, auth flow, app shell (sidebar: Home, Members, Discussions, Solutions, Events, Spotlights; admin sees Admin), seed data.
✅ Non-allowlisted email is refused without an email being sent · allowlisted email signs in via magic link and `status` flips to `active` · RLS verified with two test users (a member cannot update another member's profile) · shell responsive at 375px.
**Phase 2 — Content surfaces.** Members directory + profiles + edit, Solutions + interest capture, Events + RSVP, Home.
✅ Search/filters work · interest button persists across reload · RSVP toggles correctly · every page has loading/empty/error states.
**Phase 3 — Community.** Discussions list/new/thread, realtime replies, likes, Spotlights public pages.
✅ Two browsers: a reply in one appears in the other within ~1s without refresh · optimistic posting with failure rollback + toast · pinned-first ordering · locked posts block the composer.
**Phase 4 — Admin.** Overview, Hive tree + leaderboard, member CRUD + CSV import, content CRUD, moderation, interests export.
✅ Tree renders seed hierarchy correctly with accurate downline counts · CSV import round-trips a 140-row file with a correct error report · non-admin hitting `/admin/*` is redirected · draft content invisible to members.
**Phase 5 — Hardening.** Empty/error-state audit, mobile audit, `noindex` verification, Vercel deploy with envs, Lighthouse pass (LCP < 2.5s on Home), pilot checklist.
---
## 12. Working agreements
1. Ask before: new dependencies, schema changes beyond this brief, anything in §10.
2. Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client. Admin mutations via server actions with server-side role checks.
3. Every user-visible string follows §5 writing rules.
4. Small commits, one concern each. Migrations are append-only.
5. When this brief conflicts with something I say casually in chat, flag the conflict — this brief wins until we amend it in writing.
---
## 13. Decisions needed from stakeholder (track at top of README)
- [ ] Final brand: logo files, exact hex palette, chosen typefaces (provisional tokens in §5 until then)
- [ ] Domain (e.g. `codehive.redington…`) and magic-link sender address
- [ ] Contact email for the not-on-allowlist login message
- [ ] Confirm naming: platform = CodeHive, events = PodHive
- [ ] Initial admin list (names + emails)
- [ ] Sign-off on incentive-leaderboard visibility being admin-only
---
## 14. Definition of done (v1 ships when all are true)
- [ ] All Phase 1–5 acceptance criteria pass
- [ ] Real ~140-member CSV imported cleanly with referral lineage intact
- [ ] Hive tree matches reality for at least two known referral chains
- [ ] 8–10 real discussions and 2–3 real spotlights seeded by the Redington team before any member email goes out
- [ ] Pilot cohort of 10–15 friendly members onboarded and active for one week
- [ ] Zero console errors on any route; zero unhandled promise rejections
- [ ] Deployed on Vercel behind the final domain, `noindex` confirmed live
