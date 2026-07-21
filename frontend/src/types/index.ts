export type BasicHand = "scissors" | "rock" | "paper";
export type SpecialHand = "gun" | "middleFinger" | "mirror";
export type Hand = BasicHand | SpecialHand;

export type GameState = "WAITING" | "READY" | "PLAYING" | "RESULT";

export interface Player {
  socketId: string;
  nickname: string;
  ready: boolean;
  selectedHand: Hand | null;
  wins: number;
  // 본인 카드는 정확한 값, 상대방 카드는 기본카드만 정확하고 특수카드(gun/middleFinger/mirror)는
  // 서버에서 0으로 가려져서 옴 — 대신 specialCardCount로 총 보유량만 알 수 있음
  cards: Record<Hand, number>;
  specialCardCount: number;
  isAI?: boolean;
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
