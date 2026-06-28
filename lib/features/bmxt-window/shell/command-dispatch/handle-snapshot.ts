import { parseSnapshotSaveLine } from "../../../snapshot/snapshot-save-input"
import {
  clearPrompt,
  recordCommandHistory,
  type CommandDispatchContext,
  type CommandDispatchResult
} from "./types"

export function tryHandleSnapshotSaveCommand(ctx: CommandDispatchContext): CommandDispatchResult {
  const { deps, trimmed } = ctx
  const parsed = parseSnapshotSaveLine(trimmed)
  if (parsed === null) {
    return "not_handled"
  }
  deps.appendCommandToHistory(trimmed)
  clearPrompt(deps)
  recordCommandHistory(deps)
  deps.setSubCmdPicker(null)
  void deps.runSnapshotSave(trimmed, parsed.tabId)
  deps.focusPrompt()
  return "handled"
}
