import { BasicHand, Hand, baseOf, isSpecialHand } from "./rps.types";

const BEATS: Record<BasicHand, BasicHand> = {
  rock: "scissors",
  scissors: "paper",
  paper: "rock",
};

export interface RpsOutcome {
  result: "A" | "B" | "draw";
  winsDelta: number;
}

export function judgeRps(handA: Hand, handB: Hand): RpsOutcome {
  const specialA = isSpecialHand(handA);
  const specialB = isSpecialHand(handB);
  const baseA = baseOf(handA);
  const baseB = baseOf(handB);

  const baseResult: "A" | "B" | "draw" =
    baseA === baseB ? "draw" : BEATS[baseA] === baseB ? "A" : "B";

  if (specialA === specialB) {
    // 기본 vs 기본, 특수 vs 특수 모두 원래 가위바위보 규칙
    return { result: baseResult, winsDelta: baseResult === "draw" ? 0 : 1 };
  }

  // 특수 vs 기본
  const specialSide: "A" | "B" = specialA ? "A" : "B";
  const otherSide: "A" | "B" = specialSide === "A" ? "B" : "A";

  if (baseResult === "draw") {
    return { result: specialSide, winsDelta: 1 };
  }
  if (baseResult === specialSide) {
    return { result: specialSide, winsDelta: 2 };
  }
  return { result: otherSide, winsDelta: 2 };
}
