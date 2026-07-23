/**
 * EN: First-command tokens that `browse` may wrap (`browse <token> -list …`).
 * JA: `browse` が包める第一コマンド（`browse <token> -list …`）。
 */
export const PICKER_LIST_PRODUCER_TOKENS = [
  "dom",
  "search",
  "session",
  "setting",
  "tab"
] as const

export type PickerListProducerToken = (typeof PICKER_LIST_PRODUCER_TOKENS)[number]
