import { BASIC_HANDS, Hand, SPECIAL_HANDS } from "./rps.types";

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

// 보유한 특수카드(총/중지/거울)가 있으면 우선적으로 내고, 없으면 기본 카드 중 무작위로 냄.
export function chooseAiHand(cards: Record<Hand, number>): Hand {
  const availableSpecials = SPECIAL_HANDS.filter((hand) => cards[hand] > 0);
  if (availableSpecials.length > 0) return pickRandom(availableSpecials);
  return pickRandom(BASIC_HANDS.filter((hand) => cards[hand] > 0));
}
