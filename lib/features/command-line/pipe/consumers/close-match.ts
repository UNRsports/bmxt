import type { BmxtRuleKind } from "../../../bmxt-rule/kinds.ts"

const CLOSE_PIPE_RE = /^\s*(close|c)\s*$/i

export const CLOSE_ACCEPTS_BMXT_RULE_KINDS: readonly BmxtRuleKind[] = ["page.open"]

export function isClosePipeConsumer(segment: string): boolean {
  return CLOSE_PIPE_RE.test(segment.trim())
}
