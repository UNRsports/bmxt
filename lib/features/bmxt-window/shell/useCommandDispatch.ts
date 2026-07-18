import { useCallback } from "react"
import { lineHasCompoundOperator, runCompoundLine } from "../../command-line/compound"
import { continuationPromptAfterLoneFirstToken } from "../../builtin-commands/command-subcommands.gen"
import { ensureBmxtCore } from "../../bmxt-core/wasm-host"
import { runDispatch } from "../../bmxt-core/dispatch"
import { effectiveCommandLocale } from "../../setting/effective-command-locale"
import { applyUiAction } from "./apply-ui-action"
import { tryHandleExternalSettingsRecovery } from "./command-dispatch/handle-external-settings-recovery"
import { dispatchFallbackCommand } from "./command-dispatch/handle-fallback"
import { tryHandlePickerCommand } from "./command-dispatch/handle-picker"
import {
  clearPrompt,
  recordCommandHistory,
  type CommandDispatchContext,
  type CommandDispatchDeps
} from "./command-dispatch/types"

export type { CommandDispatchDeps } from "./command-dispatch/types"

function handleISearchExit(deps: CommandDispatchDeps): void {
  const pick = deps.iSearchMatches[deps.iSearchCycle]
  const next = pick !== undefined ? pick : deps.iSearchSnapshot
  deps.setMode("normal")
  deps.setLine(next)
  deps.setCursorPos(next.length)
  deps.setISearchCycle(0)
  deps.setHistNavIndex(-1)
  deps.tabPressSeqRef.current = 0
  deps.focusPrompt()
}

function tryHandleSessionNameTyping(ctx: CommandDispatchContext): boolean {
  if (!ctx.deps.sessionNameTypingRef.current) {
    return false
  }
  ctx.deps.appendCommandToHistory(ctx.trimmed)
  ctx.deps.saveSessionDisplayName(ctx.trimmed, [])
  return true
}

function handleLinesBundle(ctx: CommandDispatchContext, lines: string[]): void {
  const { deps, trimmed } = ctx
  deps.appendCommandToHistory(trimmed)
  clearPrompt(deps)
  recordCommandHistory(deps)
  void deps.appendLogLines([`> ${trimmed}`, ...lines])
  const continuationPrompt = continuationPromptAfterLoneFirstToken(trimmed)
  if (continuationPrompt) {
    deps.setSubCmdPicker(null)
    deps.setLine(continuationPrompt)
    deps.setCursorPos(continuationPrompt.length)
    deps.lineRef.current = continuationPrompt
  }
  deps.focusPrompt()
}

export function useCommandDispatch(deps: CommandDispatchDeps) {
  const submitLine = useCallback(() => {
    deps.allowEmptyFirstPickerSyncRef.current = false
    deps.imeTokenPickerDismissedRef.current = false

    if (deps.mode === "isearch") {
      handleISearchExit(deps)
      return
    }

    const rawLine = deps.promptLine()
    const trimmed = rawLine.trim()
    if (!trimmed) {
      return
    }

    const commandLocale = effectiveCommandLocale(
      deps.uiSettings,
      deps.settingListPickerRef.current
    )

    const ctx: CommandDispatchContext = {
      deps,
      trimmed,
      rawLine,
      locale: commandLocale
    }

    if (tryHandleExternalSettingsRecovery(ctx) === "handled") {
      return
    }

    if (tryHandleSessionNameTyping(ctx)) {
      return
    }

    if (tryHandlePickerCommand(ctx) === "handled") {
      return
    }

    void (async () => {
      try {
        await ensureBmxtCore()
      } catch (e) {
        deps.appendCommandToHistory(trimmed)
        clearPrompt(deps)
        recordCommandHistory(deps)
        const message = e instanceof Error ? e.message : String(e)
        void deps.appendLogLines([
          `> ${trimmed}`,
          `error: BMXt core failed to load (${message})`
        ])
        deps.focusPrompt()
        return
      }

      if (lineHasCompoundOperator(trimmed)) {
        void runCompoundLine(trimmed, deps, commandLocale)
        return
      }

      const bundle = runDispatch(trimmed, commandLocale)

      if (bundle.ty === "ui" && bundle.action) {
        if (applyUiAction(bundle.action, ctx)) {
          return
        }
      }

      if (bundle.ty === "lines") {
        handleLinesBundle(ctx, bundle.lines ?? [])
        return
      }

      if (bundle.ty === "effects") {
        dispatchFallbackCommand(ctx)
        return
      }

      dispatchFallbackCommand(ctx)
    })()
  }, [deps])

  return { submitLine }
}
