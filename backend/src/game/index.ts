import { Room } from "../room/room.types";
import { judgeRps } from "./rps/rps.game";
import { Hand } from "./rps/rps.types";

export interface GameResult {
  winner: string | "draw";
  hands: Record<string, Hand>;
}

export function judgeGame(room: Room): GameResult {
  const [playerA, playerB] = room.players;
  const handA = playerA.selectedHand as Hand;
  const handB = playerB.selectedHand as Hand;

  switch (room.gameType) {
    case "rps": {
      const result = judgeRps(handA, handB);
      const winner = result === "draw" ? "draw" : result === "A" ? playerA.socketId : playerB.socketId;
      return { winner, hands: { [playerA.socketId]: handA, [playerB.socketId]: handB } };
    }
    default:
      throw new Error(`지원하지 않는 게임 타입입니다: ${room.gameType}`);
  }
}
