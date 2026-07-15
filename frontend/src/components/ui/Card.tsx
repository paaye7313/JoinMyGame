import type { HTMLAttributes } from "react";

function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-3xl border border-border bg-panel p-8 shadow-panel ${className}`}
      {...props}
    />
  );
}

export default Card;
