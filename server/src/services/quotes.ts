import type { QuoteRow } from "../types/domain.js";

export const DEFAULT_QUOTES: Array<Omit<QuoteRow, "id">> = [
  { text: "Сейчас не нужно быть идеальным. Нужно просто не курить этот час.", author: null },
  { text: "Тяга проходит волной. Ты уже умеешь пережидать волны.", author: null },
  { text: "Каждая таблетка и каждый отказ — это голос за будущего тебя.", author: null },
  { text: "Не спорь с тягой. Заметь её, вдохни, дай ей уйти.", author: null },
  { text: "Свобода складывается из маленьких решений, принятых вовремя.", author: null },
  { text: "Сегодня достаточно сделать следующий правильный шаг.", author: null },
  { text: "Ты не теряешь сигарету. Ты возвращаешь себе воздух.", author: null }
];

export function quoteIndexForDate(date = new Date(), count: number): number {
  if (count <= 0) {
    return 0;
  }
  const days = Math.floor(date.getTime() / 86_400_000);
  return days % count;
}
