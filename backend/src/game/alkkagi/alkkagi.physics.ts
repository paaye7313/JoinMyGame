import { AlkkagiKeyframe, AlkkagiPieceInput, SimulateRoundResult, Vec2 } from "./alkkagi.types";

// 튜닝값 — 전부 placeholder, 실제 플레이해보며 조정 예정
export const ARENA_START_RADIUS = 220;
export const ARENA_MIN_RADIUS = 90;
export const ARENA_SHRINK_PER_ROUND = 20;
export const PIECE_RADIUS = 24;
export const FRICTION = 0.96;
export const STOP_SPEED = 2;
export const MAX_STEPS = 300;
export const POWER_TO_SPEED = 18;

const ARENA_CENTER: Vec2 = { x: 0, y: 0 };

export function nextArenaRadius(currentRadius: number): number {
  return Math.max(ARENA_MIN_RADIUS, currentRadius - ARENA_SHRINK_PER_ROUND);
}

// 원형 무대 위에 인원수만큼 균등 배치(무대 반경의 절반 지점에 원형으로)
export function createStartingPositions(count: number, arenaRadius: number): Vec2[] {
  const startDist = arenaRadius * 0.5;
  const positions: Vec2[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (2 * Math.PI * i) / count;
    positions.push({ x: Math.cos(angle) * startDist, y: Math.sin(angle) * startDist });
  }
  return positions;
}

interface PieceState {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  alive: boolean;
}

function resolveCollisions(states: PieceState[]): void {
  for (let i = 0; i < states.length; i++) {
    for (let j = i + 1; j < states.length; j++) {
      const a = states[i];
      const b = states[j];
      if (!a.alive || !b.alive) continue;

      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.hypot(dx, dy) || 0.0001;
      const overlap = PIECE_RADIUS * 2 - dist;
      if (overlap <= 0) continue;

      const nx = dx / dist;
      const ny = dy / dist;

      // 겹친 만큼 서로 밀어내기
      a.x -= (nx * overlap) / 2;
      a.y -= (ny * overlap) / 2;
      b.x += (nx * overlap) / 2;
      b.y += (ny * overlap) / 2;

      // 동일 질량 탄성 충돌 — 법선 방향 속도 성분만 교환
      const avn = a.vx * nx + a.vy * ny;
      const bvn = b.vx * nx + b.vy * ny;
      const diff = bvn - avn;
      a.vx += diff * nx;
      a.vy += diff * ny;
      b.vx -= diff * nx;
      b.vy -= diff * ny;
    }
  }
}

// 살아있는 말들의 조준을 동시에 발사해 전원이 멈추거나 MAX_STEPS에 도달할 때까지 시뮬레이션.
// 매 스텝의 위치 스냅샷을 keyframes로 기록해 반환 — 클라이언트는 이걸 그대로 재생만 하면 됨.
export function simulateRound(inputs: AlkkagiPieceInput[], arenaRadius: number): SimulateRoundResult {
  const states: PieceState[] = inputs.map((input) => {
    const mag = Math.hypot(input.aim.dx, input.aim.dy) || 1;
    const power = Math.max(0, Math.min(1, input.aim.power));
    return {
      id: input.id,
      x: input.x,
      y: input.y,
      vx: (input.aim.dx / mag) * power * POWER_TO_SPEED,
      vy: (input.aim.dy / mag) * power * POWER_TO_SPEED,
      alive: true,
    };
  });

  const keyframes: AlkkagiKeyframe[] = [];
  const eliminated: string[] = [];

  for (let step = 0; step < MAX_STEPS; step++) {
    let anyMoving = false;

    for (const s of states) {
      if (!s.alive) continue;
      s.x += s.vx;
      s.y += s.vy;
    }

    resolveCollisions(states);

    for (const s of states) {
      if (!s.alive) continue;

      s.vx *= FRICTION;
      s.vy *= FRICTION;
      const speed = Math.hypot(s.vx, s.vy);
      if (speed < STOP_SPEED) {
        s.vx = 0;
        s.vy = 0;
      } else {
        anyMoving = true;
      }

      const distFromCenter = Math.hypot(s.x - ARENA_CENTER.x, s.y - ARENA_CENTER.y);
      if (distFromCenter > arenaRadius) {
        s.alive = false;
        eliminated.push(s.id);
      }
    }

    keyframes.push({ players: states.map((s) => ({ id: s.id, x: s.x, y: s.y, alive: s.alive })) });

    if (!anyMoving) break;
  }

  return { keyframes, eliminated };
}
