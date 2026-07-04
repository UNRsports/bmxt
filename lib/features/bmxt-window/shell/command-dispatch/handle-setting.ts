import {
  parseSettingExitListLine,
  parseSettingIncompleteLine,
  parseSettingListLine
} from "../../../setting/setting-list-picker-input"
import { tryRunPlainListCommand } from "../../../command-line/list-commands"
import { tSetting } from "../../../setting/i18n/ns/setting"
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

  const settingList = parseSettingListLine(trimmed)
  if (settingList !== null) {
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
