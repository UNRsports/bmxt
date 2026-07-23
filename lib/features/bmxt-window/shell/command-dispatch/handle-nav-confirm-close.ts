import { tNav } from "../../../setting/i18n/ns/nav"
import { tError } from "../../../setting/i18n/ns/error"
import {
  formatNavConfirmCloseLockedPrefix,
  parseNavConfirmCloseAnswer,
  type NavConfirmCloseTarget
} from "../../../nav/nav-confirm-close"
import { answerAfterLockedPrefix } from "../prompt-locked-prefix"
import {
  isRunCmdResult,
  type SessionPatch
} from "../../terminal-sessions/session-patches"
import { runCommandFromUiAsync } from "../../terminal-sessions/session-runtime-client"
import {
  clearPrompt,
  recordCommandHistory,
  setContinuationPrompt,
  type CommandDispatchContext,
  type CommandDispatchResult
} from "./types"

function confirmMessageKey(
  target: NavConfirmCloseTarget
): "nav.confirm.close" | "nav.confirm.windowclose" {
  if (target === "window") {
    return "nav.confirm.windowclose"
  }
  return "nav.confirm.close"
}

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

function restoreLockedConfirmPrompt(
  deps: CommandDispatchContext["deps"],
  lockedPrefix: string
): void {
  setContinuationPrompt(deps, lockedPrefix)
}

export function tryHandleNavConfirmClose(
  ctx: CommandDispatchContext
): CommandDispatchResult {
  const pendingRef = ctx.deps.navConfirmClosePendingRef
  const pending = pendingRef.current
  if (!pending) {
    return "not_handled"
  }

  const { deps, locale, rawLine } = ctx
  const lockedPrefix = pending.lockedPrefix
  // EN: Confirm prompt not applied yet (or stale command still in the buffer) — restore, do not parse.
  if (!rawLine.startsWith(lockedPrefix)) {
    restoreLockedConfirmPrompt(deps, lockedPrefix)
    return "handled"
  }

  const answerRaw = answerAfterLockedPrefix(rawLine, lockedPrefix)
  const answer = parseNavConfirmCloseAnswer(answerRaw)
  const confirmLine = lockedPrefix + answerRaw.trimEnd()

  recordCommandHistory(deps)

  if (answer === "invalid") {
    void deps.appendLogLines([confirmLine, tNav("nav.confirm.invalid", locale)])
    restoreLockedConfirmPrompt(deps, lockedPrefix)
    return "handled"
  }
  if (answer === "no") {
    pendingRef.current = null
    clearPrompt(deps)
    void deps.appendLogLines([confirmLine, tNav("nav.confirm.cancelled", locale)])
    deps.focusPrompt()
    return "handled"
  }

  pendingRef.current = null
  clearPrompt(deps)
  const confirmedLine =
    pending.target === "window"
      ? "nav -windowclose --confirmed"
      : "tab -close --confirmed"
  void (async () => {
    await Promise.resolve(deps.appendLogLines([confirmLine], "stdout"))
    // EN: Float host dies with the closed tab — persist logs before RUN_CMD removes it.
    await deps.flushFloatPersist()
    try {
      const response = await runCommandFromUiAsync(
        confirmedLine,
        deps.sessionId,
        deps.sessionOrderLength,
        locale,
        deps.hostKind
      )
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
      // EN: Popup keeps the result log here; float may already be gone (handoff owns it).
      deps.applyRunCmdPatches(patchesWithoutPromptEcho(response.patches))
    } catch (e) {
      void deps.appendLogLines(
        [
          tError("error.dispatchFailed", locale, {
            message: e instanceof Error ? e.message : String(e)
          })
        ],
        "stderr"
      )
    }
  })()
  deps.focusPrompt()
  return "handled"
}

export function beginNavConfirmClose(
  ctx: CommandDispatchContext,
  target: NavConfirmCloseTarget
): void {
  const question = tNav(confirmMessageKey(target), ctx.locale)
  const lockedPrefix = formatNavConfirmCloseLockedPrefix(question)
  ctx.deps.appendCommandToHistory(ctx.trimmed)
  recordCommandHistory(ctx.deps)
  ctx.deps.setSubCmdPicker(null)
  // EN: Apply locked confirm prompt synchronously — do not wait on log I/O.
  //     Pending is set after the prompt so clamp cannot rewrite the prior command line.
  setContinuationPrompt(ctx.deps, lockedPrefix)
  ctx.deps.navConfirmClosePendingRef.current = { target, lockedPrefix }
  void ctx.deps.appendLogLines([`> ${ctx.trimmed}`])
}
