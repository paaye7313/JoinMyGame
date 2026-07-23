import { AlkkagiState } from "../game/alkkagi/alkkagi.types";
import { Hand } from "../game/rps/rps.types";

export type GameState = "WAITING" | "READY" | "PLAYING" | "RESULT";

export interface Player {
  socketId: string;
  nickname: string;
  ready: boolean;
  isAI?: boolean;
  // RPS 전용
  selectedHand: Hand | null;
  wins: number;
  cards: Record<Hand, number>;
  // 알까기 전용
  alkkagi?: AlkkagiState;
}

export interface Room {
  roomCode: string;
  gameType: string;
  maxPlayers: number;
  players: Player[];
  gameState: GameState;
  // RPS 전용
  drawStack: number;
  winsToMatch: number;
  // 알까기 전용
  alkkagiArena?: { radius: number; round: number };
}
