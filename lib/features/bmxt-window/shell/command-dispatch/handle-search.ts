import {
  isSearchListContinuationPrompt,
  isSearchListReadyToRun,
  parseSearchListPickerLine
} from "../../../search/search-list-picker-input"
import { parseSearchListLine } from "../../../search/search-list-parse"
import { runSearchListPlainOnUi } from "../../../search/run-search-list-plain-ui"
import {
  clearPrompt,
  recordCommandHistory,
  type CommandDispatchContext,
  type CommandDispatchResult
} from "./types"

export function tryHandleSearchListCommand(ctx: CommandDispatchContext): CommandDispatchResult {
  const { deps, trimmed, rawLine, locale } = ctx

  const searchListPickerLine = parseSearchListPickerLine(trimmed)
  if (searchListPickerLine !== null) {
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
    void deps.runSearchListSearch(trimmed, searchListPickerLine)
    return "handled"
  }

  const plainParsed = parseSearchListLine(trimmed)
  if (plainParsed !== null && !plainParsed.picker) {
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
    void runSearchListPlainOnUi(deps, trimmed, plainParsed.dispatchLine, locale)
    return "handled"
  }

  return "not_handled"
}
