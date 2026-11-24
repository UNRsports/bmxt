import {
  isRunCmdResult,
  type SessionPatch
} from "../../terminal-sessions/session-patches"
import { runCommandFromUiAsync } from "../../terminal-sessions/session-runtime-client"
import { parseSearchListLine } from "../../../search/search-list-parse"
import { runSearchListPlainOnUi } from "../../../search/run-search-list-plain-ui"
import { applyHostEffects } from "../../../dispatch/apply-effects"
import type { DispatchHostContext } from "../../../dispatch/dispatch-context"
import { shouldCancelJob } from "../../../job"
import { tError } from "../../../setting/i18n/ns/error"
import { tShell } from "../../../setting/i18n/ns/shell"
import type { UiLocale } from "../../../setting/locale"
import {
  clearPrompt,
  recordCommandHistory,
  type CommandDispatchContext,
  type CommandDispatchDeps
} from "./types"

/** EN: `aboutbmxt -system` must probe FSA/WebRTC in the prompt window (not the SW). */
function isAboutbmxtSystemLine(line: string): boolean {
  const tokens = line.trim().split(/\s+/).filter((t) => t.length > 0)
  if (tokens.length !== 2) {
    return false
  }
  return tokens[0]!.toLowerCase() === "aboutbmxt" && tokens[1] === "-system"
}

function stubUiEffectDispatchCtx(
  deps: CommandDispatchDeps,
  locale: UiLocale
): DispatchHostContext {
  return {
    enqueueSessionPatch: () => {},
    clearLog: async () => {},
    exitPane: async () => [],
    listWindows: async () => [],
    focusInfo: async () => [],
    resolveTabArg: async () => undefined,
    commandSessionId: deps.sessionId,
    uiLocale: locale
  }
}

function runAboutbmxtSystemOnUi(
  deps: CommandDispatchDeps,
  trimmed: string,
  locale: UiLocale
): void {
  deps.appendCommandToHistory(trimmed)
  clearPrompt(deps)
  recordCommandHistory(deps)
  void deps.appendLogLines([`> ${trimmed}`], "stdout")
  const busyToken = deps.beginCommandBusy(tShell("shell.commandBusy.working", locale))
  void (async () => {
    try {
      const lines = await applyHostEffects(stubUiEffectDispatchCtx(deps, locale), [
        { kind: "probe_capabilities" }
      ])
      if (!deps.isBusyTokenActive(busyToken)) {
        return
      }
      await deps.appendLogLines(lines, "stdout")
    } catch (e) {
      if (!deps.isBusyTokenActive(busyToken)) {
        return
      }
      await deps.appendLogLines(
        [
          tError("error.dispatchFailed", locale, {
            message: e instanceof Error ? e.message : String(e)
          })
        ],
        "stderr"
      )
    } finally {
      deps.endCommandBusy(busyToken)
    }
  })()
  deps.focusPrompt()
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

  // EN: Plain search runs on the UI thread so the prompt busy indicator and Ctrl+C work.
  if (parseSearchListLine(trimmed) !== null) {
    void runSearchListPlainOnUi(deps, trimmed, trimmed, locale)
    return
  }

  // EN: Capability probe needs page APIs (FSA / WebRTC) — skip SW RUN_CMD.
  if (isAboutbmxtSystemLine(trimmed)) {
    runAboutbmxtSystemOnUi(deps, trimmed, locale)
    return
  }

  deps.appendCommandToHistory(trimmed)
  clearPrompt(deps)
  recordCommandHistory(deps)
  // EN: Echo immediately — SW paths can take seconds before patches arrive.
  void deps.appendLogLines([`> ${trimmed}`], "stdout")

  const busyToken = deps.beginCommandBusy(tShell("shell.commandBusy.working", locale))
  deps.jobRunner.cancel("run-cmd")

  void deps.jobRunner.start(
    "run-cmd",
    async (job) => {
      try {
        const response = await runCommandFromUiAsync(
          trimmed,
          deps.sessionId,
          deps.sessionOrderLength,
          locale,
          deps.hostKind
        )
        if (shouldCancelJob(job)) {
          return
        }
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
        if (!deps.isBusyTokenActive(busyToken)) {
          return
        }
        deps.applyRunCmdPatches(patchesWithoutPromptEcho(response.patches))
      } catch (e) {
        if (shouldCancelJob(job) || !deps.isBusyTokenActive(busyToken)) {
          return
        }
        void deps.appendLogLines(
          [
            tError("error.dispatchFailed", locale, {
              message: e instanceof Error ? e.message : String(e)
            })
          ],
          "stderr"
        )
      } finally {
        deps.endCommandBusy(busyToken)
      }
    },
    { meta: { line: trimmed }, persist: false }
  )
  deps.focusPrompt()
}
