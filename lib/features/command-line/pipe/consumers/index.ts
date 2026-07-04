export type { PipeConsumerEntry } from "./types.ts"
export {
  PIPE_CONSUMER_ENTRIES,
  listResultAcceptsKinds,
  matchPipeConsumer,
  tryRunPipeConsumer
} from "./registry.ts"
export { CLOSE_ACCEPTS_KINDS, isClosePipeConsumer } from "./close-match.ts"
export { closePipeConsumer } from "./close-from-tabs.ts"
