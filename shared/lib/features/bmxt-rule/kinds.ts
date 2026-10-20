/** EN: Known bmxtRule record kinds (extensible — manifest is the catalog source). */

export const BMXT_RULE_KINDS = [
  "page.open",
  "page.window",
  "page.group",
  "bookmark",
  "history",
  "markdown.file",
  "search.hit",
  "dom.node",
  "dom.notice",
  "session.row",
  "setting.field"
] as const

export type BmxtRuleKind = (typeof BMXT_RULE_KINDS)[number]

const KNOWN_KINDS = new Set<string>(BMXT_RULE_KINDS)

export function isKnownBmxtRuleKind(kind: string): kind is BmxtRuleKind {
  return KNOWN_KINDS.has(kind)
}
