export type BasicHand = "scissors" | "rock" | "paper";
export type SpecialHand = "gun" | "middleFinger" | "mirror";
export type Hand = BasicHand | SpecialHand;

export const BASIC_HANDS: BasicHand[] = ["scissors", "rock", "paper"];
export const SPECIAL_HANDS: SpecialHand[] = ["gun", "middleFinger", "mirror"];

export const SPECIAL_BASE: Record<SpecialHand, BasicHand> = {
  gun: "scissors",
  middleFinger: "rock",
  mirror: "paper",
};

export function isSpecialHand(hand: Hand): hand is SpecialHand {
  return hand in SPECIAL_BASE;
}

export function baseOf(hand: Hand): BasicHand {
  return isSpecialHand(hand) ? SPECIAL_BASE[hand] : hand;
}
