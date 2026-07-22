# CodeHive — Stacked by Redington

The invite-only web community platform for ~140 senior technology leaders
across the Middle East, Africa and India, run by Redington's Software
Solutions Group. Members share real AI and Copilot success stories, raise
their hands on solutions, meet at **PodHive** events, and grow their
**Hive** — the referral network Redington tracks and rewards.

The single source of truth for scope and decisions is
[`CLAUDE.md`](CLAUDE.md) (the master build brief).

## Decisions needed from the stakeholder

- [ ] Final brand: logo files, exact hex palette, chosen typefaces
      (provisional tokens live in `tailwind.config.ts` + `src/app/globals.css`;
      current typography pass: **Fraunces** display / **Hanken Grotesk** body /
      **Spline Sans Mono** metrics — alternates to consider: Bricolage
      Grotesque or Instrument Serif for display)
- [ ] Domain (e.g. `codehive.redington…`) and magic-link sender address
- [ ] Contact email for the not-on-allowlist login message
      (placeholder in `src/lib/constants.ts` → `CONTACT_EMAIL`)
- [ ] Confirm naming: platform = CodeHive, events = PodHive
- [ ] Initial admin list (names + emails)
- [ ] Sign-off on incentive-leaderboard visibility being admin-only

## Stack

Next.js 14 (App Router) · TypeScript strict · Tailwind CSS (custom tokens,
no component libraries) · Supabase (Postgres, Auth, Realtime, Storage) ·
Vercel. Small deps only: `zod`, `react-hook-form`, `date-fns` +
`date-fns-tz`, `lucide-react`.

## Getting started

1. **Install**: `npm install`
2. **Supabase**: create a project (or `supabase start` locally), then apply
   everything in `supabase/migrations/` in order, and optionally
   `supabase/seed.sql` for the fictional demo data.
   - Register `<APP_URL>/auth/callback` as a redirect URL in Auth settings.
   - Set the email OTP expiry to 15 minutes (`supabase/config.toml` does this
     for local dev).
3. **Env**: `cp .env.example .env.local` and fill in
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY` (server-only), `NEXT_PUBLIC_APP_URL`.
4. **Run**: `npm run dev` → sign in at `/login` with a seeded email
   (e.g. `priya.raghavan@redington.example.com` for the admin; grab the
   magic link from Inbucket at `localhost:54324` when running Supabase
   locally).

`npm run build` · `npm run typecheck` · `npm run lint` all must stay green.

### Demo mode (no Supabase needed)

For design previews without a backend, set `NEXT_PUBLIC_DEMO_MODE=1` in
`.env.local` and run `npm run dev` — the app renders every screen from
in-memory fixtures (`src/lib/demo/`) mirroring the seed data, signed in as
the admin. Dev-only: no real auth, RLS or realtime. Never set this flag in
production. Test sign-in accounts for the real stack are in
`supabase/seed.sql`: `demo.cto@codehive.test`, `demo.cio@codehive.test`,
`demo.member@codehive.test`.

## Layout

```
CLAUDE.md               master build brief (source of truth)
supabase/migrations/    schema + RLS, append-only
supabase/seed.sql       fictional demo data (14 members, 3-level Hive, ...)
src/middleware.ts       session refresh + route protection
src/app/login           allowlist-gated magic-link flow
src/app/(app)/          member surfaces: home, members, discussions,
                        solutions, events, spotlights
src/app/(app)/admin/    role-gated admin: overview, hive-tree, members
                        (+CSV import), content CRUD, moderation, interests
src/components/ui/      internal component set (Button … Tabs)
src/lib/                supabase clients, auth guards, markdown, csv, dates
```

## Security posture

- Invite-only: `/login` checks the `members` allowlist (service role,
  case-insensitive) **before** any magic link is sent; non-members get no
  email and no membership information.
- RLS enabled on every table per the matrix in `CLAUDE.md` §7; member
  self-edits are column-restricted by a trigger.
- `SUPABASE_SERVICE_ROLE_KEY` is only imported in `src/lib/supabase/admin.ts`
  (server actions that first call `requireAdmin()`), with a runtime guard
  against client bundling.
- Private platform: `X-Robots-Tag: noindex` on every route + `robots.txt`
  disallow-all + `metadata.robots` noindex.

## Legacy: CloudQuarks prototypes

This repo previously hosted a CloudQuarks marketplace design workspace.
The self-contained HTML prototypes remain untouched in
[`revamp/`](revamp/) and [`revamp-dark/`](revamp-dark/), and the design
skills under `.claude/skills/` (with the 21st.dev Magic MCP wiring in
`.mcp.json`) are still available.
