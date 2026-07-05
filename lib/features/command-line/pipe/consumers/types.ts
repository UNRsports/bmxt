import type { CommandDispatchDeps } from "../../../bmxt-window/shell/command-dispatch/types.ts"
import type { UiLocale } from "../../../setting/locale.ts"
import type { BmxtRuleStream } from "../../../bmxt-rule/types.ts"
import type { SegmentOutcome } from "../../compound/types.ts"

/** EN: Plug-in entry for a pipe consumer stage (right-hand side of `|`). */
export type PipeConsumerEntry = {
  id: string
  match: (segment: string) => boolean
  /** EN: bmxtRule record kinds this consumer can read from stdin stream. */
  acceptsKinds: readonly string[]
  run: (
    stream: BmxtRuleStream,
    deps: CommandDispatchDeps,
    locale: UiLocale,
    segment: string
  ) => Promise<SegmentOutcome>
}
