import { COMMANDS } from "../../../bmxt-core/registry/table.gen.ts"
import {
  makePageOpenTabActionConsumer,
  PAGE_OPEN_TAB_ACTION_ACCEPTS_KINDS
} from "./page-open-tab-action.ts"

export { PAGE_OPEN_TAB_ACTION_ACCEPTS_KINDS as FORWARD_ACCEPTS_BMXT_RULE_KINDS }

function resolvesToForward(token: string): boolean {
  const k = token.toLowerCase()
  for (const c of COMMANDS) {
    if (c.name !== "forward") {
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

export function isForwardPipeConsumer(segment: string): boolean {
  const trimmed = segment.trim()
  if (trimmed.length === 0) {
    return false
  }
  const parts = trimmed.split(/\s+/).filter((p) => p.length > 0)
  if (parts.length !== 1) {
    return false
  }
  return resolvesToForward(parts[0]!)
}

export const forwardPipeConsumer = makePageOpenTabActionConsumer({
  id: "forward",
  commandName: "forward",
  match: isForwardPipeConsumer,
  noTabsKey: "pipe.forward.noTabs",
  formatSegment: (tabId) => `forward #t:${tabId}`
})
