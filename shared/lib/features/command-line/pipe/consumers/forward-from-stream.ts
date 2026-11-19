import { classifyPipeConsumer } from "./classify.ts"
import {
  makePageOpenTabActionConsumer,
  PAGE_OPEN_TAB_ACTION_ACCEPTS_KINDS
} from "./page-open-tab-action.ts"

export { PAGE_OPEN_TAB_ACTION_ACCEPTS_KINDS as FORWARD_ACCEPTS_BMXT_RULE_KINDS }

export function isForwardPipeConsumer(segment: string): boolean {
  return classifyPipeConsumer(segment)?.id === "forward"
}

export const forwardPipeConsumer = makePageOpenTabActionConsumer({
  id: "forward",
  commandName: "forward",
  match: isForwardPipeConsumer,
  noTabsKey: "pipe.forward.noTabs",
  formatSegment: (tabId) => `forward ${tabId}`
})
