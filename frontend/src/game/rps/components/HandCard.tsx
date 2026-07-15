import type { CardDef } from "../cards";

type Outcome = "win" | "lose" | "draw";
type Size = "sm" | "lg";

interface HandCardProps {
  card: CardDef;
  flipped: boolean;
  outcome?: Outcome;
  disabled?: boolean;
  onClick?: () => void;
  size?: Size;
  className?: string;
}

const SIZE_CLASSES: Record<Size, string> = {
  lg: "h-36 w-24 sm:h-44 sm:w-32",
  sm: "h-24 w-16",
};

const OUTCOME_CLASSES: Record<Outcome, string> = {
  win: "border-secondary ring-4 ring-secondary/50 shadow-[0_0_24px_rgba(52,211,153,0.45)]",
  lose: "border-border opacity-50",
  draw: "border-peach ring-4 ring-peach/40",
};

function HandCard({
  card,
  flipped,
  outcome,
  disabled,
  onClick,
  size = "lg",
  className = "",
}: HandCardProps) {
  const frontBorder = outcome
    ? OUTCOME_CLASSES[outcome]
    : card.category === "special"
      ? "border-peach ring-2 ring-peach/50"
      : "border-border";

  const visual = (
    <div className={`flip-card ${SIZE_CLASSES[size]} ${flipped ? "is-flipped" : ""} ${className}`}>
      <div className="flip-card-inner">
        <div className="flip-card-face flip-card-back flex items-center justify-center rounded-2xl border-2 border-primary-border bg-[repeating-linear-gradient(135deg,var(--primary-bg),var(--primary-bg)_10px,var(--primary-border)_10px,var(--primary-border)_12px)] text-3xl">
          🎴
        </div>
        <div
          className={`flip-card-face flip-card-front flex flex-col items-center justify-center gap-1 rounded-2xl border-2 bg-panel transition ${frontBorder}`}
        >
          <span className="text-4xl">{card.icon}</span>
          <span className="text-sm font-semibold text-text-h">{card.label}</span>
        </div>
      </div>
    </div>
  );

  if (!onClick) return visual;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="transition hover:-translate-y-1 disabled:pointer-events-none disabled:opacity-40"
    >
      {visual}
    </button>
  );
}

export default HandCard;
