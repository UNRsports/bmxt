import { parseTabsExitListLine } from "../../../tabs/input"
import { closeTabPickerEngineForSession } from "../../../tabs/engine"
import { tTabs } from "../../../setting/i18n/ns/tabs"
import { deactivateModeToolbar } from "../../mode-toolbar-order"
import {
  clearPrompt,
  recordCommandHistory,
  type CommandDispatchContext,
  type CommandDispatchResult
} from "./types"

export function tryHandleTabsListCommand(ctx: CommandDispatchContext): CommandDispatchResult {
  const { deps, trimmed, locale } = ctx

  if (parseTabsExitListLine(trimmed)) {
    deps.appendCommandToHistory(trimmed)
    clearPrompt(deps)
    recordCommandHistory(deps)
    void (async () => {
      const logLines = [`> ${trimmed}`]
      if (deps.tabPickerRef.current !== null) {
        closeTabPickerEngineForSession(deps.sessionId)
        deps.setTabPicker(deps.sessionId, null)
        deps.setModeToolbarOrder((prev) => deactivateModeToolbar(prev, "tabs"))
        deps.activatePaneFocus("terminal")
        logLines.push(tTabs("tabs.picker.closed", locale))
      } else {
        logLines.push(tTabs("tabs.picker.notOpen", locale))
      }
      await deps.appendLogLines(logLines)
      deps.focusPrompt()
    })()
    return "handled"
  }

  return "not_handled"
}
