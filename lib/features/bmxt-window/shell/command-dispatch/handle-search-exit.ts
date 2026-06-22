import { parseSearchExitListLine } from "../../../search/search-list-picker-input"
import { tSearch } from "../../../setting/i18n/ns/search"
import { deactivateModeToolbar } from "../../mode-toolbar-order"
import {
  clearPrompt,
  recordCommandHistory,
  type CommandDispatchContext,
  type CommandDispatchResult
} from "./types"

export function tryHandleSearchExitCommand(ctx: CommandDispatchContext): CommandDispatchResult {
  const { deps, trimmed, locale } = ctx

  if (!parseSearchExitListLine(trimmed)) {
    return "not_handled"
  }

  deps.appendCommandToHistory(trimmed)
  clearPrompt(deps)
  recordCommandHistory(deps)
  void (async () => {
    const logLines = [`> ${trimmed}`]
    const hadActiveJob = deps.jobRunner.isActive("search-list")
    if (hadActiveJob) {
      deps.jobRunner.cancel("search-list")
    }
    deps.clearSearchLoadingProgress()
    if (deps.searchListPickerRef.current !== null) {
      deps.setSearchListPicker(deps.sessionId, null)
      deps.setModeToolbarOrder((prev) => deactivateModeToolbar(prev, "search"))
      deps.activatePaneFocus("terminal")
      logLines.push(tSearch("search.picker.closed", locale))
    } else if (hadActiveJob) {
      logLines.push(tSearch("search.picker.cancelled", locale))
    } else {
      logLines.push(tSearch("search.picker.notOpen", locale))
    }
    await deps.appendLogLines(logLines)
    deps.focusPrompt()
  })()
  return "handled"
}
