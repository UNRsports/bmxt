import { buildTabPickerRowsBundle, resolveInitialTabPickerHighlightIndex } from "../../../tabs/picker-rows"
import { parseGroupNewInteractiveLine } from "../../../tabs/input"
import { openTabPickerEngineForSession } from "../../../tabs/engine"
import { tGroup } from "../../../setting/i18n/ns/group"
import { tError } from "../../../setting/i18n/ns/error"
import { activateModeToolbar } from "../../mode-toolbar-order"
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
      deps.setModeToolbarOrder((prev) => activateModeToolbar(prev, "tabs"))
      void deps.appendLogLines([`> ${trimmed}`, tGroup("group.newPicker", locale)])
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
