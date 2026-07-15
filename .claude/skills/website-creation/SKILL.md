---
name: website-creation
description: >-
  Build modern, production-quality websites and landing pages using 21st.dev
  Magic components (React + TypeScript + Tailwind CSS + shadcn/ui). Use this when
  the user wants to create a website, landing page, marketing site, portfolio,
  dashboard UI, or any web front-end, or wants to generate/insert polished UI
  components via 21st.dev's Magic MCP (the `/ui` workflow). Triggers on requests
  like "build me a website", "create a landing page", "make a hero section",
  "add a pricing table", "design a navbar", or "generate a UI component".
---

# Website Creation with 21st.dev

This skill helps you build modern websites by combining a solid React/Tailwind/
shadcn foundation with **21st.dev Magic** — an AI component generator that turns
natural-language prompts into production-ready React components.

Learn more: <https://21st.dev/> · Magic MCP: <https://github.com/21st-dev/magic-mcp>

## When to use this skill

Use it whenever the user wants to create or extend a web front-end: a full site,
a landing/marketing page, a portfolio, a dashboard shell, or a single polished
section (hero, navbar, pricing, testimonials, footer, feature grid, etc.).

## The stack 21st.dev emits

Every component 21st.dev generates assumes this stack — set the project up to
match before generating, or the imports will break:

- **React + TypeScript**
- **Tailwind CSS** (utility classes)
- **shadcn/ui** (component primitives) built on **Radix UI**
- **lucide-react** for icons
- Optional: `framer-motion` (animation), `class-variance-authority`, `clsx`,
  `tailwind-merge` (the `cn()` helper)

## Workflow

Follow these phases. Don't skip the setup check — the #1 cause of broken
21st.dev components is a missing shadcn/Tailwind foundation.

### 1. Confirm intent & scope

Clarify (only if unclear): what kind of site, how many pages/sections, any
brand colors/fonts, and whether this is a new project or an existing one.

### 2. Ensure the foundation exists

Check the project for these. If missing, scaffold them first:

- A React app (Vite or Next.js). For a fresh static site, prefer **Vite +
  React + TS**; for anything needing routing/SSR/SEO, prefer **Next.js**.
- Tailwind CSS configured (`tailwind.config.*`, `postcss`, the `@tailwind`
  directives in the global stylesheet).
- shadcn/ui initialized (`components.json`, the `cn()` util in
  `lib/utils.ts`, and `lucide-react` installed).

See `references/setup.md` for exact commands.

### 3. Generate components with 21st.dev Magic

Two paths, depending on what's available:

**Path A — Magic MCP is configured (preferred).** In the AI chat, type `/ui`
followed by a description, e.g. `/ui a hero section with a headline, subtext,
two CTA buttons, and a product screenshot on the right`. Magic returns a
complete React + TS component. After it lands:
  1. Install any shadcn primitives it imports (`npx shadcn@latest add button
     card ...`).
  2. Fix import paths to match this project's alias (usually `@/components/ui`).
  3. Wire the component into the page and verify it renders.

To configure Magic MCP for this repo, see `references/magic-mcp.md`.

**Path B — Magic MCP is NOT available (no API key / offline).** Don't block.
Hand-write the component in the *same* stack (React + TS + Tailwind + shadcn),
matching 21st.dev's conventions so it can be swapped later. Browse
<https://21st.dev/> for design inspiration and structure.

### 4. Assemble the page

Compose generated/section components into pages. Keep a clear structure:
`components/ui/` (shadcn primitives), `components/sections/` (hero, pricing,
etc.), and `app/` or `src/pages/` for page composition. See
`references/patterns.md` for a recommended layout and a landing-page section
checklist.

### 5. Verify

Run the dev server and confirm each section renders, is responsive (mobile →
desktop), and works in light/dark mode if the design calls for it. Fix any
missing dependencies or broken imports before declaring done.

## Quality bar

- **Responsive first** — every section works from ~360px to wide desktop.
- **Accessible** — semantic HTML, alt text, focus states, sufficient contrast.
- **Theme-aware** — support light/dark via Tailwind's `dark:` where relevant.
- **No placeholder slop** — real copy structure, sensible spacing, consistent
  scale. 21st.dev's whole pitch is "components that fight AI slop" — hold that bar.
- **Self-contained deps** — install what components import; never leave dangling
  imports.

## References

- `references/setup.md` — scaffold Vite/Next + Tailwind + shadcn commands.
- `references/magic-mcp.md` — configure the 21st.dev Magic MCP server.
- `references/patterns.md` — project layout + landing-page section checklist.
