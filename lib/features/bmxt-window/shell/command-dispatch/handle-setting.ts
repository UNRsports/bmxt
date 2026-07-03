import {
  parseSettingExitListLine,
  parseSettingIncompleteLine,
  parseSettingListLine,
  parseSettingListPickerLine
} from "../../../setting/setting-list-picker-input"
import { tryRunPlainListCommand } from "../../../command-line/list-commands"
import { createSettingListPickerState } from "../../../setting/setting-list-picker-state"
import { tSetting } from "../../../setting/i18n/ns/setting"
import { tError } from "../../../setting/i18n/ns/error"
import { activateModeToolbar } from "../../mode-toolbar-order"
import {
  setContinuationPrompt,
  clearPrompt,
  recordCommandHistory,
  type CommandDispatchContext,
  type CommandDispatchResult
} from "./types"

export function tryHandleSettingCommand(ctx: CommandDispatchContext): CommandDispatchResult {
  const { deps, trimmed, locale } = ctx

  if (parseSettingIncompleteLine(trimmed)) {
    deps.appendCommandToHistory(trimmed)
    recordCommandHistory(deps)
    setContinuationPrompt(deps, "setting ")
    void deps.appendLogLines([`> ${trimmed}`, tSetting("setting.usage", locale)])
    return "handled"
  }

  if (parseSettingListPickerLine(trimmed)) {
    deps.appendCommandToHistory(trimmed)
    clearPrompt(deps)
    recordCommandHistory(deps)
    void (async () => {
      try {
        const state = createSettingListPickerState(deps.uiSettings)
        await deps.appendLogLines([`> ${trimmed}`, tSetting("setting.picker.hint", locale)])
        deps.setSettingListPicker(deps.sessionId, state)
        deps.setModeToolbarOrder((prev) => activateModeToolbar(prev, "setting"))
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

  const settingList = parseSettingListLine(trimmed)
  if (settingList !== null && !settingList.picker) {
    deps.appendCommandToHistory(trimmed)
    clearPrompt(deps)
    recordCommandHistory(deps)
    void (async () => {
      const lines = await tryRunPlainListCommand(trimmed, { locale, deps })
      await deps.appendLogLines([`> ${trimmed}`, ...(lines ?? [])])
      deps.focusPrompt()
    })()
    return "handled"
  }

  if (parseSettingExitListLine(trimmed)) {
    deps.appendCommandToHistory(trimmed)
    clearPrompt(deps)
    recordCommandHistory(deps)
    void (async () => {
      const logLines = [`> ${trimmed}`]
      if (deps.settingListPickerRef.current !== null) {
        deps.closeSettingPickerColumn()
        logLines.push(tSetting("setting.picker.closed", locale))
      } else {
        logLines.push(tSetting("setting.picker.notOpen", locale))
      }
      await deps.appendLogLines(logLines)
      deps.focusPrompt()
    })()
    return "handled"
  }

  return "not_handled"
}
