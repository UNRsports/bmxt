export {
  PIPE_CONSUMER_ENTRIES,
  matchPipeConsumer,
  tryRunPipeConsumer,
  bmxtRuleStreamAcceptsKinds,
  tabIdsFromBmxtRuleStream
} from "./registry.ts"
export type { PipeConsumerEntry } from "./types.ts"
export { isClosePipeConsumer, CLOSE_ACCEPTS_BMXT_RULE_KINDS } from "./close-match.ts"
