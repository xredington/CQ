# Project layout & landing-page patterns

## Recommended structure

```
src/
├─ components/
│  ├─ ui/            # shadcn primitives (button, card, input, ...)
│  └─ sections/      # composed sections: Hero, Features, Pricing, Footer, ...
├─ lib/
│  └─ utils.ts       # cn() helper
├─ pages/  or  app/  # page composition (Next.js uses app/)
└─ index.css         # Tailwind directives + design tokens
```

Keep 21st.dev-generated primitives in `components/ui/` and larger generated
blocks in `components/sections/`. Pages import sections; sections import
primitives. This keeps regeneration/swapping painless.

## Landing-page section checklist

A typical marketing site, top to bottom. Generate or build each as its own
section component:

1. **Navbar** — logo, links, CTA; collapses to a mobile menu.
2. **Hero** — headline, subtext, primary + secondary CTA, product visual.
3. **Social proof** — logo strip or "trusted by" row.
4. **Features** — grid or alternating rows with icons + copy.
5. **How it works** — 3–4 step flow.
6. **Testimonials** — quotes with names/avatars.
7. **Pricing** — tiers with feature lists, highlighted plan, billing toggle.
8. **FAQ** — accordion.
9. **CTA band** — final conversion prompt.
10. **Footer** — nav columns, socials, legal, newsletter.

## Design tokens

Define brand colors, radius, and fonts once (Tailwind theme + CSS variables) so
every section stays consistent. shadcn's default token setup in `index.css`
(`--background`, `--foreground`, `--primary`, ...) is a good base — override the
values to match the brand instead of hardcoding colors in components.

## Responsiveness

- Mobile-first: base styles target small screens; add `md:`/`lg:` for larger.
- Test at ~360px, ~768px, and ~1280px.
- Images: `max-width: 100%`; use responsive grids (`grid` + `md:grid-cols-*`).

## Accessibility

- Semantic landmarks (`<header>`, `<nav>`, `<main>`, `<footer>`).
- Alt text on images; labels on inputs.
- Visible focus states; keyboard-navigable menus/dialogs (shadcn/Radix give
  this for free — don't strip it).
- Check color contrast, especially in dark mode.
