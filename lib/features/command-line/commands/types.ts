import type { CommandDispatchDeps } from "../../bmxt-window/shell/command-dispatch/types.ts"
import type { UiLocale } from "../../setting/locale.ts"
import type { SegmentOutcome } from "../compound/types.ts"

/**
 * EN: Where a command runs in the BMXt POSIX Profile.
 * - `ui` — BMXt window (pickers, session state, plain `-list` via list-commands)
 * - `background` — Service Worker `RUN_CMD` (effects are Chrome adapters only)
 */
export type CommandRuntime = "ui" | "background"

/**
 * EN: One shell-layer command entry (parse/match + run).
 * Compound / pipe segments resolve through WASM `runDispatch` + UiAction apply
 * (see `run-command.ts`); `COMMAND_ENTRIES` is empty.
 */
export type CommandEntry = {
  readonly id: string
  readonly runtime: CommandRuntime
  /**
   * EN: Return an outcome when this entry owns the segment; `null` to try the next entry.
   */
  tryRun: (
    segment: string,
    deps: CommandDispatchDeps,
    locale: UiLocale
  ) => Promise<SegmentOutcome | null>
}
