import { buildTabPickerRowsBundle, resolveInitialTabPickerHighlightIndex } from "../../../tabs/picker-rows"
import { parseTabsExitListLine, parseTabsListPickerLine } from "../../../tabs/input"
import {
  closeTabPickerEngineForSession,
  openTabPickerEngineForSession
} from "../../../tabs/engine"
import { settingTokenForPageActiveMode } from "../../../tabs/page-active-setting"
import { tTabs } from "../../../setting/i18n/ns/tabs"
import { tError } from "../../../setting/i18n/ns/error"
import { activateModeToolbar, deactivateModeToolbar } from "../../mode-toolbar-order"
import { mountTabPickerLoadingColumn } from "./open-tab-picker-column"
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
    deps.setTabPicker(deps.sessionId, mountTabPickerLoadingColumn(deps.sessionId, showUrl))
    deps.setModeToolbarOrder((prev) => activateModeToolbar(prev, "tabs"))
    void (async () => {
      try {
        const { rows, lastNormalWindowId } = await buildTabPickerRowsBundle(
          showUrl,
          deps.uiSettings.locale
        )
        const initialHi = resolveInitialTabPickerHighlightIndex(rows, lastNormalWindowId)
        const pageActiveToken = settingTokenForPageActiveMode(deps.tabsPageActiveModeRef.current)
        deps.setTabPicker(
          deps.sessionId,
          openTabPickerEngineForSession(deps.sessionId, { rows, showUrl, initialHi })
        )
        void deps.appendLogLines([
          `> ${trimmed}`,
          tTabs("tabs.picker.hint", locale, { token: pageActiveToken })
        ])
      } catch (e) {
        if (deps.tabPickerRef.current?.rows.length === 0) {
          closeTabPickerEngineForSession(deps.sessionId)
          deps.setTabPicker(deps.sessionId, null)
          deps.setModeToolbarOrder((prev) => deactivateModeToolbar(prev, "tabs"))
        }
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
