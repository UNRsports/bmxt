/** EN: `close` / alias as pipe consumer — judgment via WASM. */

import type { BmxtRuleKind } from "../../../bmxt-rule/kinds.ts"
import { classifyPipeConsumer } from "./classify.ts"

/** EN: bmxtRule kinds accepted by the `close` pipe consumer. */
export const CLOSE_ACCEPTS_BMXT_RULE_KINDS: readonly BmxtRuleKind[] = ["page.open"]

/**
 * EN: True when the segment resolves to the `close` consumer (aliases from codegen registry in Rust).
 */
export function isClosePipeConsumer(segment: string): boolean {
  return classifyPipeConsumer(segment)?.id === "close"
}
