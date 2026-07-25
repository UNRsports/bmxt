import { COMMANDS } from "../../../bmxt-core/registry/table.gen.ts"
import {
  makePageOpenTabActionConsumer,
  PAGE_OPEN_TAB_ACTION_ACCEPTS_KINDS
} from "./page-open-tab-action.ts"

export { PAGE_OPEN_TAB_ACTION_ACCEPTS_KINDS as BACK_ACCEPTS_BMXT_RULE_KINDS }

function resolvesToBack(token: string): boolean {
  const k = token.toLowerCase()
  for (const c of COMMANDS) {
    if (c.name !== "back") {
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

export function isBackPipeConsumer(segment: string): boolean {
  const trimmed = segment.trim()
  if (trimmed.length === 0) {
    return false
  }
  const parts = trimmed.split(/\s+/).filter((p) => p.length > 0)
  if (parts.length !== 1) {
    return false
  }
  return resolvesToBack(parts[0]!)
}

export const backPipeConsumer = makePageOpenTabActionConsumer({
  id: "back",
  commandName: "back",
  match: isBackPipeConsumer,
  noTabsKey: "pipe.back.noTabs",
  formatSegment: (tabId) => `back ${tabId}`
})
