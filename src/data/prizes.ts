import type { Prize } from "../types";
import { EVENT } from "../config/event";

// Prize amounts are read from src/config/event.ts. Empty amounts are shown as
// "To be announced" rather than being invented.
export const PRIZES: Prize[] = [
  { label: "First prize", amount: EVENT.prizes.first, highlight: true },
  { label: "Second prize", amount: EVENT.prizes.second },
  { label: "Third prize", amount: EVENT.prizes.third },
];

export const SPECIAL_AWARDS = EVENT.prizes.special;

export const PRIZES_ANNOUNCED =
  Boolean(EVENT.prizes.first || EVENT.prizes.second || EVENT.prizes.third) ||
  SPECIAL_AWARDS.length > 0;
