# Configuring 21st.dev Magic MCP

Magic MCP is a thin client: it sends your `/ui` prompt to 21st.dev's hosted API
and writes the returned React + TypeScript component into your project. It
requires an API key and network access, and each generation uses a credit from
your quota.

## 1. Get an API key

Create one at <https://21st.dev/magic/console> (sign in with the 21st.dev
account). Keep it out of source control — pass it via env var / MCP config, not
a committed file.

## 2. Add the MCP server

### Claude Code (project-scoped `.mcp.json`)

Create `.mcp.json` at the repo root:

```json
{
  "mcpServers": {
    "magic": {
      "command": "npx",
      "args": ["-y", "@21st-dev/magic@latest"],
      "env": { "API_KEY": "${TWENTYFIRST_API_KEY}" }
    }
  }
}
```

Then export the key in your shell (or the environment's secrets) rather than
hard-coding it:

```bash
export TWENTYFIRST_API_KEY="your-key-here"
```

Or add it with the CLI:

```bash
claude mcp add magic -- npx -y @21st-dev/magic@latest
```

### Cursor / Windsurf / VS Code (Cline)

Add the same server block to the editor's MCP settings
(`~/.cursor/mcp.json`, Windsurf MCP config, or Cline's MCP settings), using
`API_KEY` in the `env`.

## 3. Use it

In the AI chat, type `/ui` and describe the component:

```
/ui a responsive pricing section with three tiers, a "most popular"
    highlighted middle card, monthly/yearly toggle, and feature checklists
```

Magic returns a complete component. After it's inserted:

1. `npx shadcn@latest add <primitives it imports>`
2. Fix import paths to this project's alias (`@/components/ui/...`).
3. Render it and verify.

Magic also supports **SVGL** for brand logos/assets — ask for a specific brand
logo and it can fetch the official SVG.

## Fallback

No key or no network? Don't block on Magic. Hand-write the component in the same
stack (React + TS + Tailwind + shadcn) so it stays swappable, and use
<https://21st.dev/> for structure/design reference.
