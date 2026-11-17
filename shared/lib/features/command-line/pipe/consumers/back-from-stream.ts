import { classifyPipeConsumer } from "./classify.ts"
import {
  makePageOpenTabActionConsumer,
  PAGE_OPEN_TAB_ACTION_ACCEPTS_KINDS
} from "./page-open-tab-action.ts"

export { PAGE_OPEN_TAB_ACTION_ACCEPTS_KINDS as BACK_ACCEPTS_BMXT_RULE_KINDS }

export function isBackPipeConsumer(segment: string): boolean {
  return classifyPipeConsumer(segment)?.id === "back"
}

export const backPipeConsumer = makePageOpenTabActionConsumer({
  id: "back",
  commandName: "back",
  match: isBackPipeConsumer,
  noTabsKey: "pipe.back.noTabs",
  formatSegment: (tabId) => `back ${tabId}`
})
