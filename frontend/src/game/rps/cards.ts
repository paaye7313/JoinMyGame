import type { Hand } from "../../types";

export interface CardDef {
  id: Hand;
  label: string;
  icon: string;
  category: "basic" | "special";
  tag?: string;
}

// 한국어 관용 순서(가위-바위-보)를 기준으로 정렬. 앞으로 카드/이모지 순서는 항상 이 순서를 따름.
export const HAND_CARDS: CardDef[] = [
  { id: "scissors", label: "가위", icon: "✌️", category: "basic" },
  { id: "rock", label: "바위", icon: "✊", category: "basic" },
  { id: "paper", label: "보", icon: "✋", category: "basic" },
  { id: "gun", label: "총", icon: "🔫", category: "special", tag: "가위의 강화판" },
  { id: "middleFinger", label: "중지", icon: "🖕", category: "special", tag: "바위의 강화판" },
  { id: "mirror", label: "거울", icon: "🪞", category: "special", tag: "보의 강화판" },
];

export function getCardDef(hand: Hand): CardDef {
  const card = HAND_CARDS.find((c) => c.id === hand);
  if (!card) throw new Error(`Unknown hand: ${hand}`);
  return card;
}
