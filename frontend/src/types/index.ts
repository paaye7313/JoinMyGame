export type BasicHand = "scissors" | "rock" | "paper";
export type SpecialHand = "gun" | "middleFinger" | "mirror";
export type Hand = BasicHand | SpecialHand;

export type GameState = "WAITING" | "READY" | "PLAYING" | "RESULT";

export interface Player {
  socketId: string;
  nickname: string;
  ready: boolean;
  isAI?: boolean;
  // RPS 전용
  selectedHand: Hand | null;
  wins: number;
  // 본인 카드는 정확한 값, 상대방 카드는 기본카드만 정확하고 특수카드(gun/middleFinger/mirror)는
  // 서버에서 0으로 가려져서 옴 — 대신 specialCardCount로 총 보유량만 알 수 있음
  cards: Record<Hand, number>;
  specialCardCount: number;
  // 알까기 전용
  alkkagi?: AlkkagiState;
}

// 알까기 — 위치는 상대에게도 그대로 공개됨(RPS 카드와 달리 숨길 정보가 아님)
export interface AlkkagiAim {
  dx: number;
  dy: number;
  power: number;
}

export interface AlkkagiState {
  x: number;
  y: number;
  alive: boolean;
  aim: AlkkagiAim | null;
}

export interface AlkkagiArena {
  radius: number;
  round: number;
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

export interface AlkkagiRoundResultPayload {
  keyframes: AlkkagiKeyframe[];
  arenaRadius: number;
  round: number;
  matchOver: boolean;
  winnerId: string | null;
}

export interface ChatMessage {
  socketId: string;
  nickname: string;
  message: string;
  timestamp: number;
}

export interface GameResult {
  winner: string | "draw";
  hands: Record<string, Hand>;
  winsDelta: number;
  scores: Record<string, number>;
  matchOver: boolean;
  cardsReset: boolean;
  drawStack: number;
}
