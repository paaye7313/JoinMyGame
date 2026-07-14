import { Hand } from "../game/rps/rps.types";

export type GameState = "WAITING" | "READY" | "PLAYING" | "RESULT";

export interface Player {
  socketId: string;
  nickname: string;
  ready: boolean;
  selectedHand: Hand | null;
}

export interface Room {
  roomCode: string;
  gameType: string;
  players: Player[];
  gameState: GameState;
}
