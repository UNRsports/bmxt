import { continuationPromptAfterLoneFirstToken } from "../../../builtin-commands/command-subcommands.gen"
import { buildHelpLines } from "../../../bmxt-core/registry/help"
import {
  isRunCmdResult,
  type SessionPatch
} from "../../terminal-sessions/session-patches"
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

/** EN: Drop prompt-echo lines already written by the UI before RUN_CMD returns. */
function patchesWithoutPromptEcho(patches: readonly SessionPatch[]): SessionPatch[] {
  const out: SessionPatch[] = []
  for (const patch of patches) {
    if (patch.type !== "appendLog" && patch.type !== "setLog") {
      out.push(patch)
      continue
    }
    const lines = patch.lines.filter((line) => !line.startsWith("> "))
    if (lines.length === 0) {
      continue
    }
    out.push({ ...patch, lines })
  }
  return out
}

export function dispatchFallbackCommand(ctx: CommandDispatchContext): void {
  const { deps, trimmed, locale } = ctx

  deps.appendCommandToHistory(trimmed)
  const continuationPrompt = continuationPromptAfterLoneFirstToken(trimmed)
  clearPrompt(deps)
  recordCommandHistory(deps)
  // EN: Echo immediately — search / dom plain paths can take seconds before patches arrive.
  void deps.appendLogLines([`> ${trimmed}`], "stdout")
  void runCommandFromUiAsync(trimmed, deps.sessionId, deps.sessionOrderLength, locale)
    .then((response) => {
      if (!isRunCmdResult(response)) {
        void deps.appendLogLines([tError("error.unknown", locale)], "stderr")
        return
      }
      if (response.ok === false) {
        void deps.appendLogLines(
          [tError("error.generic", locale, { message: response.error })],
          "stderr"
        )
        return
      }
      deps.applyRunCmdPatches(patchesWithoutPromptEcho(response.patches))
    })
    .catch((e) => {
      void deps.appendLogLines(
        [
          tError("error.dispatchFailed", locale, {
            message: e instanceof Error ? e.message : String(e)
          })
        ],
        "stderr"
      )
    })
  if (continuationPrompt) {
    deps.setSubCmdPicker(null)
    deps.setLine(continuationPrompt)
    deps.setCursorPos(continuationPrompt.length)
    deps.lineRef.current = continuationPrompt
  }
  deps.focusPrompt()
}
