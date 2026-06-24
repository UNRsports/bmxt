import { parseDomExitListLine } from "../../../dom/dom-list-picker-input"
import { tDom } from "../../../setting/i18n/ns/dom"
import { deactivateModeToolbar } from "../../mode-toolbar-order"
import {
  clearPrompt,
  recordCommandHistory,
  type CommandDispatchContext,
  type CommandDispatchResult
} from "./types"

export function tryHandleDomExitCommand(ctx: CommandDispatchContext): CommandDispatchResult {
  const { deps, trimmed, locale } = ctx

  if (!parseDomExitListLine(trimmed)) {
    return "not_handled"
  }

  deps.appendCommandToHistory(trimmed)
  clearPrompt(deps)
  recordCommandHistory(deps)
  void (async () => {
    const logLines = [`> ${trimmed}`]
    const hadActiveDomJob = deps.jobRunner.isActive("dom-list")
    if (hadActiveDomJob) {
      deps.jobRunner.cancel("dom-list")
    }
    if (deps.domListPickerRef.current !== null) {
      deps.setDomListPicker(deps.sessionId, null)
      deps.setModeToolbarOrder((prev) => deactivateModeToolbar(prev, "dom"))
      deps.activatePaneFocus("terminal")
      logLines.push(tDom("dom.picker.closed", locale))
    } else {
      logLines.push(tDom("dom.picker.notOpen", locale))
    }
    await deps.appendLogLines(logLines)
    deps.focusPrompt()
  })()
  return "handled"
}
