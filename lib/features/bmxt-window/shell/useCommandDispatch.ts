import { useCallback } from "react"
import { lineHasAndOperator, runCompoundLine } from "../../command-line/compound"
import { effectiveCommandLocale } from "../../setting/effective-command-locale"
import { tryHandleExternalSettingsRecovery } from "./command-dispatch/handle-external-settings-recovery"
import { tryHandleDomExitCommand } from "./command-dispatch/handle-dom-exit"
import { tryHandleDomListCommand } from "./command-dispatch/handle-dom"
import { tryHandleDomSettingCommand } from "./command-dispatch/handle-dom-setting"
import { dispatchFallbackCommand, tryHandleHelpCommand } from "./command-dispatch/handle-fallback"
import { tryHandleGroupNewCommand } from "./command-dispatch/handle-group"
import { tryHandleNavEnterCommand } from "./command-dispatch/handle-nav-enter"
import { tryHandleNavExitCommand } from "./command-dispatch/handle-nav-exit"
import { tryHandleSearchExitCommand } from "./command-dispatch/handle-search-exit"
import { tryHandleSearchListCommand } from "./command-dispatch/handle-search"
import { tryHandleSnapshotSaveCommand } from "./command-dispatch/handle-snapshot"
import { tryHandleSessionCommand } from "./command-dispatch/handle-session"
import { tryHandleSettingCommand } from "./command-dispatch/handle-setting"
import { tryHandleTabsListCommand } from "./command-dispatch/handle-tabs-list"
import { tryHandleTabsSettingCommand } from "./command-dispatch/handle-tabs-setting"
import { tryHandleTranslateCommand } from "./command-dispatch/handle-translate"
import type { CommandDispatchContext, CommandDispatchDeps } from "./command-dispatch/types"

export type { CommandDispatchDeps } from "./command-dispatch/types"

type DomainHandler = (ctx: CommandDispatchContext) => "handled" | "not_handled"

/** EN: Order matches legacy monolithic submitLine (first match wins). */
const DOMAIN_HANDLERS: readonly DomainHandler[] = [
  tryHandleSettingCommand,
  tryHandleTabsSettingCommand,
  tryHandleDomSettingCommand,
  tryHandleSessionCommand,
  tryHandleTabsListCommand,
  tryHandleSearchExitCommand,
  tryHandleNavEnterCommand,
  tryHandleTranslateCommand,
  tryHandleNavExitCommand,
  tryHandleDomExitCommand,
  tryHandleGroupNewCommand,
  tryHandleSearchListCommand,
  tryHandleHelpCommand,
  tryHandleDomListCommand,
  tryHandleSnapshotSaveCommand
]

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

    if (lineHasAndOperator(trimmed)) {
      void runCompoundLine(trimmed, deps, commandLocale)
      return
    }

    for (const handler of DOMAIN_HANDLERS) {
      if (handler(ctx) === "handled") {
        return
      }
    }

    dispatchFallbackCommand(ctx)
  }, [deps])

  return { submitLine }
}
