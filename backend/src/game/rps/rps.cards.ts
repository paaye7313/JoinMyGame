import { BASIC_HANDS, Hand, SPECIAL_HANDS } from "./rps.types";

export const STARTING_BASIC_COUNT = 2;
export const DRAWS_TO_RESET = 3;

export function createEmptyCards(): Record<Hand, number> {
  const cards = {} as Record<Hand, number>;
  for (const hand of BASIC_HANDS) cards[hand] = 0;
  for (const hand of SPECIAL_HANDS) cards[hand] = 0;
  return cards;
}

function randomSpecialHand() {
  return SPECIAL_HANDS[Math.floor(Math.random() * SPECIAL_HANDS.length)];
}

export function grantCards(cards: Record<Hand, number>, count: number): void {
  for (let i = 0; i < count; i++) {
    const hand = randomSpecialHand();
    cards[hand] += 1;
  }
}

export function createStartingCards(): Record<Hand, number> {
  const cards = createEmptyCards();
  for (const hand of BASIC_HANDS) cards[hand] = STARTING_BASIC_COUNT;
  grantCards(cards, 1);
  return cards;
}
