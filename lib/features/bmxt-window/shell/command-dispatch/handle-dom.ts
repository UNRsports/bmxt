import { parseDomListPickerLine } from "../../../dom/dom-list-picker-input"
import {
  clearPrompt,
  recordCommandHistory,
  type CommandDispatchContext,
  type CommandDispatchResult
} from "./types"

export function tryHandleDomListCommand(ctx: CommandDispatchContext): CommandDispatchResult {
  const { deps, trimmed } = ctx

  const domListLine = parseDomListPickerLine(trimmed)
  if (domListLine !== null) {
    deps.appendCommandToHistory(trimmed)
    clearPrompt(deps)
    recordCommandHistory(deps)
    deps.setSubCmdPicker(null)
    void deps.runDomListAndShow(domListLine, trimmed, true)
    return "handled"
  }

  return "not_handled"
}
