export type Hand = "scissors" | "rock" | "paper";

export type GameState = "WAITING" | "READY" | "PLAYING" | "RESULT";

export interface Player {
  socketId: string;
  nickname: string;
  ready: boolean;
  selectedHand: Hand | null;
}

export interface GameResult {
  winner: string | "draw";
  hands: Record<string, Hand>;
}
