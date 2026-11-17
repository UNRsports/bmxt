import { classifyPipeConsumer } from "./classify.ts"
import {
  makePageOpenTabActionConsumer,
  PAGE_OPEN_TAB_ACTION_ACCEPTS_KINDS
} from "./page-open-tab-action.ts"

export { PAGE_OPEN_TAB_ACTION_ACCEPTS_KINDS as RELOAD_ACCEPTS_BMXT_RULE_KINDS }

export function isReloadPipeConsumer(segment: string): boolean {
  return classifyPipeConsumer(segment)?.id === "reload"
}

export const reloadPipeConsumer = makePageOpenTabActionConsumer({
  id: "reload",
  commandName: "reload",
  match: isReloadPipeConsumer,
  noTabsKey: "pipe.reload.noTabs",
  formatSegment: (tabId) => `reload ${tabId}`
})
