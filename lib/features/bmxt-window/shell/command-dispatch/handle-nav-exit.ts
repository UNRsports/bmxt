import { parseNavExitLine } from "../../../nav"
import { tNav } from "../../../setting/i18n/ns/nav"
import { deactivateModeToolbar } from "../../mode-toolbar-order"
import {
  clearPrompt,
  recordCommandHistory,
  type CommandDispatchContext,
  type CommandDispatchResult
} from "./types"

export function tryHandleNavExitCommand(ctx: CommandDispatchContext): CommandDispatchResult {
  const { deps, trimmed, locale } = ctx

  if (!parseNavExitLine(trimmed)) {
    return "not_handled"
  }

  deps.appendCommandToHistory(trimmed)
  clearPrompt(deps)
  recordCommandHistory(deps)
  void (async () => {
    const logLines = [`> ${trimmed}`]
    if (deps.navActiveRef.current) {
      logLines.push(tNav("nav.exitActiveError", locale))
    } else if (!deps.navArmedRef.current) {
      logLines.push(tNav("nav.notArmed", locale))
    } else {
      await deps.teardownNav()
      deps.navPositionsRef.current = {}
      deps.setNavArmed(false)
      deps.setNavActive(false)
      deps.setModeToolbarOrder((prev) => deactivateModeToolbar(prev, "nav"))
      logLines.push(tNav("nav.disarmed", locale))
    }
    await deps.appendLogLines(logLines)
    deps.focusPrompt()
  })()
  return "handled"
}
