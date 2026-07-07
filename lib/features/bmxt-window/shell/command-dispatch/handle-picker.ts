import { runBrowseCommand } from "../../../picker/run-picker-command"
import { parsePickerPrefixLine } from "../../../picker/match"
import {
  clearPrompt,
  recordCommandHistory,
  setContinuationPrompt,
  type CommandDispatchContext,
  type CommandDispatchResult
} from "./types"

export function tryHandlePickerCommand(ctx: CommandDispatchContext): CommandDispatchResult {
  const { deps, trimmed, locale } = ctx
  const parsed = parsePickerPrefixLine(trimmed)
  if (parsed === null) {
    return "not_handled"
  }

  deps.appendCommandToHistory(trimmed)
  recordCommandHistory(deps)
  deps.setSubCmdPicker(null)

  if (parsed.kind === "usage") {
    void (async () => {
      const outcome = await runBrowseCommand(trimmed, deps, locale)
      const usageLines = outcome?.stdout ?? []
      await deps.appendLogLines([`> ${trimmed}`, ...usageLines], "stdout")
      setContinuationPrompt(deps, "browse ")
    })()
    return "handled"
  }

  clearPrompt(deps)

  void (async () => {
    const outcome = await runBrowseCommand(trimmed, deps, locale)
    if (outcome === null) {
      return
    }
    await deps.appendLogLines([`> ${trimmed}`, ...outcome.stdout], "stdout")
    if (outcome.stderr.length > 0) {
      await deps.appendLogLines(outcome.stderr, "stderr")
    }
    if (outcome.exitStatus !== 0) {
      deps.focusPrompt()
    }
  })()

  return "handled"
}
