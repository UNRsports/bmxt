import { canScriptHttpHostPages } from "../../../extension-permissions/optional-http-hosts"
import { parseNavEnterLine } from "../../../nav"
import { tNav } from "../../../setting/i18n/ns/nav"
import { activateModeToolbar } from "../../mode-toolbar-order"
import {
  clearPrompt,
  recordCommandHistory,
  type CommandDispatchContext,
  type CommandDispatchResult
} from "./types"

export function tryHandleNavEnterCommand(ctx: CommandDispatchContext): CommandDispatchResult {
  const { deps, trimmed, locale } = ctx

  if (!parseNavEnterLine(trimmed)) {
    return "not_handled"
  }

  deps.appendCommandToHistory(trimmed)
  clearPrompt(deps)
  recordCommandHistory(deps)
  deps.setNavArmed(true)
  deps.setNavActive(false)
  deps.setModeToolbarOrder((prev) => activateModeToolbar(prev, "nav"))
  void (async () => {
    const canPage = await canScriptHttpHostPages()
    const logLines = [`> ${trimmed}`, tNav("nav.armedLog", locale)]
    if (!canPage) {
      logLines.push(tNav("nav.hostAccessWarning", locale))
    }
    await deps.appendLogLines(logLines)
    deps.focusPrompt()
  })()
  return "handled"
}
