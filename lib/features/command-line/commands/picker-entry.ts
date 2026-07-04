import type { CommandDispatchDeps } from "../../bmxt-window/shell/command-dispatch/types.ts"
import type { UiLocale } from "../../setting/locale.ts"
import type { SegmentOutcome } from "../compound/types.ts"
import { runPickerCommand } from "../../picker/run-picker-command.ts"

/** EN: Prefix-form `picker` / `picker <list-command>` (BMXt UI). */
export async function runPickerCommandEntry(
  segment: string,
  deps: CommandDispatchDeps,
  locale: UiLocale
): Promise<SegmentOutcome | null> {
  return runPickerCommand(segment, deps, locale)
}
