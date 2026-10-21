/**
 * EN: First-command tokens that produce `-list` output (for docs / overlays).
 * JA: `-list` 列挙を出す第一コマンド（文書・オーバーレイ用）。
 */

import { LIST_COMMAND_ENTRIES } from "../command-line/list-commands/registry.ts"

export const PICKER_LIST_PRODUCER_TOKENS: readonly string[] = LIST_COMMAND_ENTRIES.map(
  (entry) => entry.command
)

export type PickerListProducerToken = (typeof PICKER_LIST_PRODUCER_TOKENS)[number]
