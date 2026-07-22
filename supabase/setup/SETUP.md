# CodeHive — production setup runbook

State: Supabase project `wrlorumnaskyglmdmfhn` created by the stakeholder.
Remaining steps, in order. **Never commit keys or tokens to this repo.**

## 1. Load the database (once, fresh project)

Either paste `codehive-setup-1-core.sql` then `codehive-setup-2-storage.sql`
into the Supabase **SQL Editor** and Run, or from a network-enabled session
with a management access token (`sbp_…`):

```bash
# Runs a SQL file via the management API
jq -Rs '{query: .}' supabase/setup/codehive-setup-1-core.sql | \
curl -X POST "https://api.supabase.com/v1/projects/<PROJECT_REF>/database/query" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" -d @-
```

Verify: `members` table has ~22 rows (Table Editor), including
`harsh.kank@redingtongroup.com` (admin) and the `x.redington+*@gmail.com`
test accounts.

## 2. Auth configuration (Dashboard → Authentication)

- URL Configuration → Site URL: the Vercel URL
- URL Configuration → Redirect URLs: add `<vercel-url>/auth/callback`
  (plus `http://localhost:3000/auth/callback` for local dev)
- Sign In / Providers → Email: OTP expiry **900** seconds (brief §6)

## 3. Vercel

Import `xredington/CQ`, production branch `claude/codehive-master-brief-rbrz1d`
(or main once merged). Env vars:

```
NEXT_PUBLIC_SUPABASE_URL      = https://wrlorumnaskyglmdmfhn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = <sb_publishable_… key>
SUPABASE_SERVICE_ROLE_KEY     = <sb_secret_… key>
NEXT_PUBLIC_APP_URL           = <the assigned vercel URL>
```

Do NOT set `NEXT_PUBLIC_DEMO_MODE` in production.

## 4. Post-deploy checks

- Sign in as admin via magic link; non-allowlisted email is refused
- `/admin` reachable for admin, redirects members to home
- Delete the `demo.*@codehive.test` placeholder rows before real launch
- Rotate any keys/tokens that were shared over chat during setup
