import { continuationPromptAfterLoneFirstToken } from "../../../builtin-commands/command-subcommands.gen"
import { buildHelpLines } from "../../../bmxt-core/registry/help"
import { isRunCmdResult } from "../../terminal-sessions/session-patches"
import { runCommandFromUiAsync } from "../../terminal-sessions/session-runtime-client"
import { tError } from "../../../setting/i18n/ns/error"
import {
  clearPrompt,
  recordCommandHistory,
  type CommandDispatchContext,
  type CommandDispatchResult
} from "./types"

export function tryHandleHelpCommand(ctx: CommandDispatchContext): CommandDispatchResult {
  const { deps, trimmed } = ctx

  if (trimmed !== "help" && trimmed !== "?") {
    return "not_handled"
  }

  deps.appendCommandToHistory(trimmed)
  clearPrompt(deps)
  recordCommandHistory(deps)
  void deps.appendLogLines([`> ${trimmed}`, ...buildHelpLines(deps.uiSettings.locale)])
  deps.focusPrompt()
  return "handled"
}

export function dispatchFallbackCommand(ctx: CommandDispatchContext): void {
  const { deps, trimmed, locale } = ctx

  deps.appendCommandToHistory(trimmed)
  const continuationPrompt = continuationPromptAfterLoneFirstToken(trimmed)
  clearPrompt(deps)
  recordCommandHistory(deps)
  void runCommandFromUiAsync(trimmed, deps.sessionId, deps.sessionOrderLength, locale)
    .then((response) => {
      if (!isRunCmdResult(response)) {
        void deps.appendLogLines([
          `> ${trimmed}`,
          tError("error.unknown", locale)
        ])
        return
      }
      if (response.ok === false) {
        void deps.appendLogLines([
          `> ${trimmed}`,
          tError("error.generic", locale, { message: response.error })
        ])
        return
      }
      deps.applyRunCmdPatches(response.patches)
    })
    .catch((e) => {
      void deps.appendLogLines([
        `> ${trimmed}`,
        tError("error.dispatchFailed", locale, {
          message: e instanceof Error ? e.message : String(e)
        })
      ])
    })
  if (continuationPrompt) {
    deps.setSubCmdPicker(null)
    deps.setLine(continuationPrompt)
    deps.setCursorPos(continuationPrompt.length)
    deps.lineRef.current = continuationPrompt
  }
  deps.focusPrompt()
}
