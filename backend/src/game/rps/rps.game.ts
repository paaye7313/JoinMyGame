import { Hand } from "./rps.types";

const BEATS: Record<Hand, Hand> = {
  rock: "scissors",
  scissors: "paper",
  paper: "rock",
};

export function judgeRps(handA: Hand, handB: Hand): "A" | "B" | "draw" {
  if (handA === handB) return "draw";
  return BEATS[handA] === handB ? "A" : "B";
}
