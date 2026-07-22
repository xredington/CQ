import type { HTMLAttributes } from "react";

type Tone = "neutral" | "accent" | "success" | "danger";

const tones: Record<Tone, string> = {
  neutral: "border-line text-ink/70",
  accent: "border-accent/40 text-accent",
  success: "border-emerald-400/40 text-emerald-300",
  danger: "border-danger/40 text-danger",
};

export function Badge({
  tone = "neutral",
  className = "",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs ${tones[tone]} ${className}`}
      {...props}
    />
  );
}
