import type { HTMLAttributes } from "react";

type Tone = "primary" | "secondary" | "peach" | "neutral";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

const TONE_CLASSES: Record<Tone, string> = {
  primary: "bg-primary-bg text-primary",
  secondary: "bg-secondary-bg text-secondary",
  peach: "bg-peach-bg text-peach",
  neutral: "bg-border/60 text-text",
};

function Badge({ tone = "neutral", className = "", ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium ${TONE_CLASSES[tone]} ${className}`}
      {...props}
    />
  );
}

export default Badge;
