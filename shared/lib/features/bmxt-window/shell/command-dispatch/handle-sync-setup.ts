import { tCmd } from "../../../setting/i18n/ns/cmd"
import { isSyncWizardOpen } from "../../../sync/wizard/sync-wizard-state.ts"
import { openSyncWizardSetup } from "../../../sync/wizard/sync-wizard-controller.ts"
import {
  clearPrompt,
  recordCommandHistory,
  type CommandDispatchContext,
  type CommandDispatchResult
} from "./types"

/**
 * EN: Open the sync setup wizard (Family + handshake). Prompt multi-step is retired.
 * JA: sync セットアップウィザードを開く（プロンプト多段対話は廃止）。
 */
export function beginSyncSetup(ctx: CommandDispatchContext): void {
  ctx.deps.appendCommandToHistory(ctx.trimmed)
  clearPrompt(ctx.deps)
  recordCommandHistory(ctx.deps)
  ctx.deps.syncSetupPendingRef.current = null
  void openSyncWizardSetup(
    {
      locale: ctx.locale,
      appendLogLines: ctx.deps.appendLogLines,
      focusPrompt: ctx.deps.focusPrompt
    },
    ctx.trimmed
  )
}

/**
 * EN: While the wizard is open, ignore prompt-line setup replies (UI owns the flow).
 * JA: ウィザード表示中はプロンプトでの setup 応答を無視する（UI が正本）。
 */
export function tryHandleSyncSetup(ctx: CommandDispatchContext): CommandDispatchResult {
  if (!isSyncWizardOpen()) {
    // EN: Legacy pending (should be unused); clear if any leftover remains.
    if (ctx.deps.syncSetupPendingRef.current) {
      ctx.deps.syncSetupPendingRef.current = null
      clearPrompt(ctx.deps)
      recordCommandHistory(ctx.deps)
      void ctx.deps.appendLogLines([
        `> ${ctx.trimmed}`,
        tCmd("cmd.sync.setup.cancelled", ctx.locale)
      ])
      ctx.deps.focusPrompt()
      return "handled"
    }
    return "not_handled"
  }
  return "not_handled"
}
