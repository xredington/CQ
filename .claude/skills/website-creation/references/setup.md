# Foundation setup

21st.dev components need React + Tailwind + shadcn/ui. Set this up once, then
generate components on top of it.

## Option A — Vite + React + TypeScript (static sites, SPAs)

```bash
# 1. Scaffold
npm create vite@latest my-site -- --template react-ts
cd my-site
npm install

# 2. Tailwind CSS
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

Configure `tailwind.config.js` content globs:

```js
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: {} },
  plugins: [],
}
```

Add to `src/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

Set up the `@/` path alias in `tsconfig.json` and `vite.config.ts` so shadcn
imports resolve (`@/components/ui/...`, `@/lib/utils`).

## Option B — Next.js (routing, SSR, SEO, multi-page)

```bash
npx create-next-app@latest my-site --typescript --tailwind --eslint --app
cd my-site
```

Tailwind and the `@/` alias are configured by the template.

## shadcn/ui (both options)

```bash
npx shadcn@latest init          # creates components.json + lib/utils.ts (cn())
npm install lucide-react        # icons used by generated components
```

Add primitives as components need them, e.g.:

```bash
npx shadcn@latest add button card input badge accordion dialog
```

## Optional extras 21st.dev components often use

```bash
npm install framer-motion class-variance-authority clsx tailwind-merge
```

`clsx` + `tailwind-merge` back the `cn()` helper that shadcn/21st components use
for conditional classes.
