# CQ — CloudQuarks

A design workspace for **CloudQuarks**, Redington's cloud & ISV marketplace for
MEA and South Asia. It contains the marketplace prototype (two design
directions) plus the [Claude Code](https://claude.com/claude-code) skills and
[21st.dev](https://21st.dev/) tooling used to build and revamp it.

## The prototype

Self-contained, single-file HTML prototypes — no build step. Open in a browser.

| Version | Path | Look |
|---|---|---|
| **Dark 3D (primary)** | [`revamp-dark/index.html`](revamp-dark/index.html) | Dark theme, animated 3D landing (glowing cloud orb, floating glass solution tiles, mouse-parallax), neon-green accents. |
| Light modern | [`revamp/index.html`](revamp/index.html) | Light theme, refined Enterprise-SaaS marketplace look. |

Both share the same functionality — SPA routing, an **AI Solution Finder**,
full **English / Arabic (RTL)** bilingual support, a "Try a Solution"
interactive demo engine (upload your own CSV/Excel), ISV **detail pages**, and a
first-visit **guided tour**. Previews live alongside each file
(`preview-*.png`).

The design system is grounded in the `ui-ux-pro-max` skill's design database
(a Marketplace + Enterprise-SaaS pattern) and the 21st.dev / `website-creation`
conventions below.

## Skills

All skills live under `.claude/skills/` and activate automatically when your
request matches their triggers.

## `website-creation` skill

Located at `.claude/skills/website-creation/`. It guides Claude through building
production-quality websites and landing pages on a React + TypeScript +
Tailwind CSS + shadcn/ui foundation, generating polished UI components via
21st.dev's **Magic MCP** (`/ui` prompts).

The skill activates automatically when you ask Claude to create a website,
landing page, hero section, pricing table, navbar, or any web front-end.

### Contents

- `SKILL.md` — the skill definition and workflow.
- `references/setup.md` — scaffold Vite/Next + Tailwind + shadcn.
- `references/magic-mcp.md` — configure the 21st.dev Magic MCP server.
- `references/patterns.md` — project layout + landing-page section checklist.

### Using 21st.dev Magic MCP

The Magic MCP server is already wired up in [`.mcp.json`](.mcp.json) at the repo
root. To activate it:

1. Get an API key at <https://21st.dev/magic/console>.
2. `cp .env.example .env` and set `TWENTYFIRST_API_KEY`, then
   `export TWENTYFIRST_API_KEY="your-key"` in your shell (`.env` is gitignored).
3. Start Claude Code in this repo and approve the `magic` MCP server when
   prompted.
4. Type `/ui` followed by a component description in your AI chat.

Full details in `.claude/skills/website-creation/references/magic-mcp.md`.

## UI/UX Pro Max skills

Imported from
[nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)
(MIT — © Next Level Builder; license preserved at
`.claude/skills/.attribution/ui-ux-pro-max-LICENSE`). This adds a searchable
design-intelligence database and several companion skills:

- **`ui-ux-pro-max`** — the flagship: a local searchable database of 84 UI
  styles, 192 color palettes, 74 font pairings, 98 UX guidelines, 25 chart
  types, and more across 22 tech stacks, plus automatic design-system
  generation. Query it directly:

  ```bash
  python .claude/skills/ui-ux-pro-max/scripts/search.py "saas landing page" --domain style
  python .claude/skills/ui-ux-pro-max/scripts/search.py "beauty spa wellness" --design-system -p "Serenity Spa"
  ```

- **`design-system`** — token architecture (primitive→semantic→component),
  component specs, and slide generation.
- **`ui-styling`** — shadcn/ui + Tailwind component styling and theming.
- **`brand`** — brand voice, visual identity, messaging, consistency checks.
- **`design`** — logos, corporate identity, presentations, icons, social images.
- **`banner-design`** — social/ad/web/print banners with art-direction options.
- **`slides`** — strategic HTML presentations with Chart.js.

These activate automatically for UI/UX, design-system, branding, and visual
work. Upstream project: <https://uupm.cc>.
