/**
 * EN: Tab completion tokens for the pipe consumer stage (right of `|`).
 * JA: パイプ右辺（consumer）の Tab 候補トークン。
 *
 * Kept free of i18n / Chrome so unit tests can import without JSON attributes.
 * Ids must stay aligned with `PIPE_CONSUMER_ENTRIES` in registry.ts.
 */

import { cmdByName } from "../../../bmxt-core/registry/table.gen.ts"

/** EN: Canonical pipe consumer command names (same order as PIPE_CONSUMER_ENTRIES). */
export const PIPE_CONSUMER_COMPLETION_IDS = [
  "browse",
  "back",
  "forward",
  "reload",
  "close"
] as const

/**
 * EN: First-token candidates for Tab after `|` (canonical ids + aliases from the command table).
 */
export function listPipeConsumerCompletionTokens(): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const id of PIPE_CONSUMER_COMPLETION_IDS) {
    const meta = cmdByName(id)
    const names = meta !== undefined ? [meta.name, ...meta.aliases] : [id]
    for (const name of names) {
      if (seen.has(name)) {
        continue
      }
      seen.add(name)
      out.push(name)
    }
  }
  return out
}
