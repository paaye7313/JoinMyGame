import { AlkkagiAim } from "./alkkagi.types";

interface PieceLike {
  x: number;
  y: number;
}

// 가장 가까운 상대를 향해 적당한 힘으로 발사(상대가 없으면 무작위 방향)
export function chooseAiAim(self: PieceLike, others: PieceLike[]): AlkkagiAim {
  let target: PieceLike | null = null;
  let minDist = Infinity;
  for (const other of others) {
    const dist = Math.hypot(other.x - self.x, other.y - self.y);
    if (dist < minDist) {
      minDist = dist;
      target = other;
    }
  }

  let dx: number;
  let dy: number;
  if (target) {
    dx = target.x - self.x;
    dy = target.y - self.y;
  } else {
    const angle = Math.random() * Math.PI * 2;
    dx = Math.cos(angle);
    dy = Math.sin(angle);
  }

  const power = 0.5 + Math.random() * 0.5;
  return { dx, dy, power };
}
