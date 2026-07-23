/**
 * EN: First-command tokens that `browse` may wrap — derived from list_id registry metadata.
 * JA: `browse` が包める第一コマンド — list_id レジストリのメタデータから導出。
 */

import { LIST_COMMAND_ENTRIES } from "../command-line/list-commands/registry.ts"

export const PICKER_LIST_PRODUCER_TOKENS: readonly string[] = LIST_COMMAND_ENTRIES.map(
  (entry) => entry.command
)

export type PickerListProducerToken = (typeof PICKER_LIST_PRODUCER_TOKENS)[number]
