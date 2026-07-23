export interface Vec2 {
  x: number;
  y: number;
}

// dx/dy는 방향(정규화 여부는 신뢰하지 않고 물리 계산 쪽에서 다시 정규화함), power는 0~1
export interface AlkkagiAim {
  dx: number;
  dy: number;
  power: number;
}

export interface AlkkagiPieceInput {
  id: string;
  x: number;
  y: number;
  aim: AlkkagiAim;
}

export interface AlkkagiSnapshot {
  id: string;
  x: number;
  y: number;
  alive: boolean;
}

export interface AlkkagiKeyframe {
  players: AlkkagiSnapshot[];
}

export interface SimulateRoundResult {
  keyframes: AlkkagiKeyframe[];
  eliminated: string[];
}

// Room/Player에 붙는 알까기 전용 상태 — RPS 필드(cards/wins 등)와 섞이지 않도록 네임스페이스로 분리
export interface AlkkagiState {
  x: number;
  y: number;
  alive: boolean;
  aim: AlkkagiAim | null;
}
