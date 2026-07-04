/**
 * EN: First-command tokens that `picker` may wrap (`picker <token> -list …`).
 * JA: `picker` が包める第一コマンド（`picker <token> -list …`）。
 */
export const PICKER_LIST_PRODUCER_TOKENS = [
  "dom",
  "search",
  "session",
  "setting",
  "tabs"
] as const

export type PickerListProducerToken = (typeof PICKER_LIST_PRODUCER_TOKENS)[number]
