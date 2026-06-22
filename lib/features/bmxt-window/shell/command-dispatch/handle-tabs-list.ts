import { buildTabPickerRows, resolveInitialTabPickerHighlightIndex } from "../../../tabs/picker-rows"
import { parseTabsExitListLine, parseTabsListPickerLine } from "../../../tabs/input"
import {
  closeTabPickerEngineForSession,
  openTabPickerEngineForSession
} from "../../../tabs/engine"
import { settingTokenForPageActiveMode } from "../../../tabs/page-active-setting"
import { tTabs } from "../../../setting/i18n/ns/tabs"
import { tError } from "../../../setting/i18n/ns/error"
import { activateModeToolbar, deactivateModeToolbar } from "../../mode-toolbar-order"
import {
  clearPrompt,
  recordCommandHistory,
  type CommandDispatchContext,
  type CommandDispatchResult
} from "./types"

export function tryHandleTabsListCommand(ctx: CommandDispatchContext): CommandDispatchResult {
  const { deps, trimmed, locale } = ctx

  const listPicker = parseTabsListPickerLine(trimmed)
  if (listPicker) {
    const { showUrl } = listPicker
    deps.appendCommandToHistory(trimmed)
    clearPrompt(deps)
    recordCommandHistory(deps)
    void (async () => {
      try {
        const rows = await buildTabPickerRows(showUrl, deps.uiSettings.locale)
        const initialHi = await resolveInitialTabPickerHighlightIndex(rows)
        const pageActiveToken = settingTokenForPageActiveMode(deps.tabsPageActiveModeRef.current)
        await deps.appendLogLines([
          `> ${trimmed}`,
          tTabs("tabs.picker.hint", locale, { token: pageActiveToken })
        ])
        deps.setTabPicker(
          deps.sessionId,
          openTabPickerEngineForSession(deps.sessionId, { rows, showUrl, initialHi })
        )
        deps.setModeToolbarOrder((prev) => activateModeToolbar(prev, "tabs"))
      } catch (e) {
        await deps.appendLogLines([
          `> ${trimmed}`,
          tError("error.generic", locale, {
            message: e instanceof Error ? e.message : String(e)
          })
        ])
      }
    })()
    return "handled"
  }

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
