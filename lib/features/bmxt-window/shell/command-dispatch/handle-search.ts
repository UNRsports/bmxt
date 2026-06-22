import {
  isSearchListContinuationPrompt,
  isSearchListReadyToRun,
  parseSearchListPickerLine
} from "../../../search/search-list-picker-input"
import {
  clearPrompt,
  recordCommandHistory,
  type CommandDispatchContext,
  type CommandDispatchResult
} from "./types"

export function tryHandleSearchListCommand(ctx: CommandDispatchContext): CommandDispatchResult {
  const { deps, trimmed, rawLine } = ctx

  const searchListLine = parseSearchListPickerLine(trimmed)
  if (searchListLine !== null) {
    if (isSearchListContinuationPrompt(rawLine)) {
      deps.appendCommandToHistory(trimmed)
      const next = `${trimmed} `
      deps.lineRef.current = next
      deps.setLine(next)
      deps.setCursorPos(next.length)
      recordCommandHistory(deps)
      deps.setSubCmdPicker(null)
      deps.focusPrompt()
      return "handled"
    }
    if (!isSearchListReadyToRun(trimmed, rawLine)) {
      deps.focusPrompt()
      return "handled"
    }
    deps.appendCommandToHistory(trimmed)
    clearPrompt(deps)
    recordCommandHistory(deps)
    deps.setSubCmdPicker(null)
    void deps.runSearchListSearch(trimmed, searchListLine)
    return "handled"
  }

  return "not_handled"
}
