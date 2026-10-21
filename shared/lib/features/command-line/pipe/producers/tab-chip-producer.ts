/**
 * EN: Parse pipe stage 0 of `#t:<id>…` chips (optional trailing incomplete `tab:` trigger).
 * JA: パイプ左辺の `#t:<id>` 列を解釈（末尾の不完全な `tab:` は無視）。
 */

import {
  isTabChipTriggerToken
} from "../../../nav/tab-chip-token.ts"
import { parseNavReloadTabToken } from "../../../nav/nav-reload-tab-token.ts"

/**
 * EN: Returns tab ids when the segment is only `#t:<id>` chips (plus optional trailing
 *     incomplete `tab:` / `tab:…` / `tab::…` triggers). Null when not a chip producer.
 */
export function parseTabChipProducerSegment(segment: string): number[] | null {
  const trimmed = segment.trim()
  if (trimmed.length === 0) {
    return null
  }
  const tokens = trimmed.split(/\s+/).filter((t) => t.length > 0)
  if (tokens.length === 0) {
    return null
  }

  const ids: number[] = []
  let sawChip = false

  for (let i = 0; i < tokens.length; i += 1) {
    const tok = tokens[i]!
    const tabId = parseNavReloadTabToken(tok)
    if (tabId !== null) {
      sawChip = true
      if (!ids.includes(tabId)) {
        ids.push(tabId)
      }
      continue
    }
    if (isTabChipTriggerToken(tok)) {
      continue
    }
    return null
  }

  if (!sawChip || ids.length === 0) {
    return null
  }
  return ids
}
