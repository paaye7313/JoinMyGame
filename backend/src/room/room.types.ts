import { Hand } from "../game/rps/rps.types";

export type GameState = "WAITING" | "READY" | "PLAYING" | "RESULT";

export interface Player {
  socketId: string;
  nickname: string;
  ready: boolean;
  selectedHand: Hand | null;
  wins: number;
  cards: Record<Hand, number>;
  isAI?: boolean;
}

export interface Room {
  roomCode: string;
  gameType: string;
  maxPlayers: number;
  players: Player[];
  gameState: GameState;
  drawStack: number;
  winsToMatch: number;
}
