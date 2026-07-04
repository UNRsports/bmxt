import type { CommandDispatchDeps } from "../../../bmxt-window/shell/command-dispatch/types.ts"
import type { UiLocale } from "../../../setting/locale.ts"
import type { ListRecordKind, ListResult } from "../../list-output/types.ts"
import type { SegmentOutcome } from "../../compound/types.ts"

/** EN: Plug-in entry for a pipe consumer stage (right-hand side of `|`). */
export type PipeConsumerEntry = {
  id: string
  match: (segment: string) => boolean
  /** EN: Record kinds this consumer can read from stdin `ListResult`. */
  acceptsKinds: readonly ListRecordKind[]
  run: (
    listResult: ListResult,
    deps: CommandDispatchDeps,
    locale: UiLocale
  ) => Promise<SegmentOutcome>
}
