import type { BmxtRuleKind } from "../../../bmxt-rule/kinds.ts"
import { COMMANDS } from "../../../bmxt-core/registry/table.gen.ts"

/** EN: bmxtRule kinds accepted by the `close` pipe consumer. */
export const CLOSE_ACCEPTS_BMXT_RULE_KINDS: readonly BmxtRuleKind[] = ["page.open"]

function resolvesToClose(token: string): boolean {
  const k = token.toLowerCase()
  for (const c of COMMANDS) {
    if (c.name !== "close") {
      continue
    }
    if (c.name === k) {
      return true
    }
    for (const alias of c.aliases) {
      if (alias.toLowerCase() === k) {
        return true
      }
    }
    return false
  }
  return false
}

/**
 * EN: True when the segment resolves to the `close` consumer via the generated command table.
 * Aliases such as `c` come from manifest codegen — not a hard-coded regex.
 */
export function isClosePipeConsumer(segment: string): boolean {
  const trimmed = segment.trim()
  if (trimmed.length === 0) {
    return false
  }
  const parts = trimmed.split(/\s+/).filter((p) => p.length > 0)
  if (parts.length !== 1) {
    return false
  }
  return resolvesToClose(parts[0]!)
}
