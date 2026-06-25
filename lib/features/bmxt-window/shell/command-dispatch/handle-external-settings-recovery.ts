import { tSetting } from "../../../setting/i18n/ns/setting"
import {
  clearPrompt,
  recordCommandHistory,
  type CommandDispatchContext,
  type CommandDispatchResult
} from "./types"

export function tryHandleExternalSettingsRecovery(
  ctx: CommandDispatchContext
): CommandDispatchResult {
  const submit = ctx.deps.submitExternalSettingsRecoveryAnswer
  if (!submit) {
    return "not_handled"
  }
  if (!ctx.deps.externalSettingsRecoveryPendingRef.current) {
    return "not_handled"
  }

  const { deps, trimmed, locale } = ctx
  clearPrompt(deps)
  recordCommandHistory(deps)

  void (async () => {
    const result = await submit(trimmed)
    const logPrefix = `> ${trimmed}`
    if (!result.ok) {
      if (result.kind === "invalid") {
        await deps.appendLogLines([
          logPrefix,
          tSetting("setting.storage.recovery.invalid", locale)
        ])
        return
      }
      if (result.kind === "pick_cancelled") {
        await deps.appendLogLines([
          logPrefix,
          tSetting("setting.storage.recovery.pickCancelled", locale)
        ])
        return
      }
      if (result.kind === "pick_failed") {
        await deps.appendLogLines([
          logPrefix,
          tSetting("setting.storage.recovery.pickFailed", locale, {
            message: result.message
          })
        ])
      }
      return
    }
    if (result.kind === "reset") {
      await deps.appendLogLines([
        logPrefix,
        tSetting("setting.storage.recovery.resetDone", locale)
      ])
      return
    }
    if (result.loaded) {
      await deps.appendLogLines([
        logPrefix,
        tSetting("setting.storage.recovery.repickLoaded", locale, {
          directory: result.directoryName
        })
      ])
      return
    }
    await deps.appendLogLines([
      logPrefix,
      tSetting("setting.storage.recovery.repickEmpty", locale, {
        directory: result.directoryName
      })
    ])
  })()

  deps.focusPrompt()
  return "handled"
}
