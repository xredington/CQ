# CQ

A [Claude Code](https://claude.com/claude-code) skill for building modern
websites with [21st.dev](https://21st.dev/) Magic components.

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

Add the server to `.mcp.json` and set a `TWENTYFIRST_API_KEY` (get one at
<https://21st.dev/magic/console>). Full instructions in
`.claude/skills/website-creation/references/magic-mcp.md`. Then type `/ui`
followed by a component description in your AI chat.
