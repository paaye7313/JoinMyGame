import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "bg-primary text-white shadow-panel hover:brightness-105 disabled:hover:brightness-100",
  secondary:
    "bg-primary-bg text-primary border border-primary-border hover:bg-primary-border/40",
  ghost: "bg-transparent text-text hover:bg-primary-bg",
};

function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`rounded-full px-6 py-2.5 font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    />
  );
}

export default Button;
