import { COMMANDS } from "../../../bmxt-core/registry/table.gen.ts"
import {
  makePageOpenTabActionConsumer,
  PAGE_OPEN_TAB_ACTION_ACCEPTS_KINDS
} from "./page-open-tab-action.ts"

export { PAGE_OPEN_TAB_ACTION_ACCEPTS_KINDS as RELOAD_ACCEPTS_BMXT_RULE_KINDS }

function resolvesToReload(token: string): boolean {
  const k = token.toLowerCase()
  for (const c of COMMANDS) {
    if (c.name !== "reload") {
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

export function isReloadPipeConsumer(segment: string): boolean {
  const trimmed = segment.trim()
  if (trimmed.length === 0) {
    return false
  }
  const parts = trimmed.split(/\s+/).filter((p) => p.length > 0)
  if (parts.length !== 1) {
    return false
  }
  return resolvesToReload(parts[0]!)
}

export const reloadPipeConsumer = makePageOpenTabActionConsumer({
  id: "reload",
  commandName: "reload",
  match: isReloadPipeConsumer,
  noTabsKey: "pipe.reload.noTabs",
  formatSegment: (tabId) => `reload #t:${tabId}`
})
