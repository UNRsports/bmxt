import type { CommandDispatchDeps } from "../../../bmxt-window/shell/command-dispatch/types.ts"
import type { UiLocale } from "../../../setting/locale.ts"
import type { BmxtRuleStream } from "../../../bmxt-rule/types.ts"
import type { ListResult } from "../../list-output/types.ts"
import type { SegmentOutcome } from "../../compound/types.ts"

/** EN: Extra stdin context for UI pipe consumers (e.g. `| browse`). */
export type PipeConsumerRunContext = {
  /** EN: Structured `-list` output from the pipe producer stage (required by browse). */
  listResult?: ListResult
  /** EN: Tabs producer `-url` flag (ignored by non-tabs families). */
  showUrl: boolean
}

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
    segment: string,
    context: PipeConsumerRunContext
  ) => Promise<SegmentOutcome>
}
