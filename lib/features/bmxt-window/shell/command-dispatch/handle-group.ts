import { buildTabPickerRowsBundle, resolveInitialTabPickerHighlightIndex } from "../../../tabs/picker-rows"
import { parseGroupNewInteractiveLine } from "../../../tabs/input"
import { closeTabPickerEngineForSession, openTabPickerEngineForSession } from "../../../tabs/engine"
import { tGroup } from "../../../setting/i18n/ns/group"
import { tError } from "../../../setting/i18n/ns/error"
import { activateModeToolbar, deactivateModeToolbar } from "../../mode-toolbar-order"
import { mountTabPickerLoadingColumn } from "./open-tab-picker-column"
import {
  clearPrompt,
  recordCommandHistory,
  type CommandDispatchContext,
  type CommandDispatchResult
} from "./types"

export function tryHandleGroupNewCommand(ctx: CommandDispatchContext): CommandDispatchResult {
  const { deps, trimmed, locale } = ctx

  if (!parseGroupNewInteractiveLine(trimmed)) {
    return "not_handled"
  }

  deps.appendCommandToHistory(trimmed)
  clearPrompt(deps)
  recordCommandHistory(deps)
  deps.setTabPicker(deps.sessionId, mountTabPickerLoadingColumn(deps.sessionId, false, "groupNew"))
  deps.setModeToolbarOrder((prev) => activateModeToolbar(prev, "tabs"))
  void (async () => {
    try {
      const { rows, lastNormalWindowId } = await buildTabPickerRowsBundle(
        false,
        deps.uiSettings.locale
      )
      const initialHi = resolveInitialTabPickerHighlightIndex(rows, lastNormalWindowId)
      deps.setTabPicker(
        deps.sessionId,
        openTabPickerEngineForSession(deps.sessionId, {
          rows,
          showUrl: false,
          initialHi,
          variant: "groupNew"
        })
      )
      void deps.appendLogLines([`> ${trimmed}`, tGroup("group.newPicker", locale)])
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
