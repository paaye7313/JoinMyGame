import { Room } from "../room/room.types";
import { judgeRps } from "./rps/rps.game";
import { Hand } from "./rps/rps.types";

export interface RoundJudgement {
  winner: string | "draw";
  hands: Record<string, Hand>;
  winsDelta: number;
}

export interface GameResult extends RoundJudgement {
  scores: Record<string, number>;
  matchOver: boolean;
  cardsReset: boolean;
  drawStack: number;
}

export function judgeGame(room: Room): RoundJudgement {
  const [playerA, playerB] = room.players;
  const handA = playerA.selectedHand as Hand;
  const handB = playerB.selectedHand as Hand;

  switch (room.gameType) {
    case "rps": {
      const outcome = judgeRps(handA, handB);
      const winner =
        outcome.result === "draw" ? "draw" : outcome.result === "A" ? playerA.socketId : playerB.socketId;
      return {
        winner,
        hands: { [playerA.socketId]: handA, [playerB.socketId]: handB },
        winsDelta: outcome.winsDelta,
      };
    }
    default:
      throw new Error(`지원하지 않는 게임 타입입니다: ${room.gameType}`);
  }
}
