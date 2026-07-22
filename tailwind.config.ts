import type { Config } from "tailwindcss";

/**
 * CodeHive design tokens — boardroom-editorial.
 * Provisional palette per brief §5; final brand hexes are swapped HERE only.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "rgb(var(--ch-bg) / <alpha-value>)",
        surface: "rgb(var(--ch-surface) / <alpha-value>)",
        raised: "rgb(var(--ch-raised) / <alpha-value>)",
        ink: "rgb(var(--ch-ink) / <alpha-value>)",
        "ink-muted": "rgb(var(--ch-ink) / 0.6)",
        "ink-faint": "rgb(var(--ch-ink) / 0.4)",
        accent: "rgb(var(--ch-accent) / <alpha-value>)",
        "accent-ink": "rgb(var(--ch-accent-ink) / <alpha-value>)",
        line: "rgb(var(--ch-ink) / 0.12)",
        "line-soft": "rgb(var(--ch-ink) / 0.08)",
        danger: "rgb(var(--ch-danger) / <alpha-value>)",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      maxWidth: {
        measure: "65ch",
      },
      borderRadius: {
        card: "0.75rem",
      },
    },
  },
  plugins: [],
};

export default config;
