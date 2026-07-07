import type { CommandDispatchDeps } from "../../bmxt-window/shell/command-dispatch/types.ts"
import type { UiLocale } from "../../setting/locale.ts"
import type { SegmentOutcome } from "../compound/types.ts"
import { runBrowseCommand } from "../../picker/run-picker-command.ts"

/** EN: Prefix-form `browse` / `browse <list-command>` (BMXt UI). */
export async function runBrowseCommandEntry(
  segment: string,
  deps: CommandDispatchDeps,
  locale: UiLocale
): Promise<SegmentOutcome | null> {
  return runBrowseCommand(segment, deps, locale)
}
