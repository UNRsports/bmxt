import { continuationPromptAfterLoneFirstToken } from "../../../builtin-commands/command-subcommands.gen"
import { buildHelpLines } from "../../../bmxt-core/registry/help"
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
  chrome.runtime.sendMessage(
    { type: "RUN_CMD", line: trimmed, sessionId: deps.sessionId },
    (response) => {
      const err = chrome.runtime.lastError
      if (err) {
        void deps.appendLogLines([
          `> ${trimmed}`,
          tError("error.dispatchFailed", locale, { message: err.message })
        ])
        return
      }
      if (response && typeof response === "object" && "ok" in response && response.ok === false) {
        const msg =
          "error" in response && typeof response.error === "string"
            ? response.error
            : tError("error.unknown", locale)
        void deps.appendLogLines([
          `> ${trimmed}`,
          tError("error.generic", locale, { message: msg })
        ])
      }
    }
  )
  if (continuationPrompt) {
    deps.setSubCmdPicker(null)
    deps.setLine(continuationPrompt)
    deps.setCursorPos(continuationPrompt.length)
    deps.lineRef.current = continuationPrompt
  }
  deps.focusPrompt()
}
