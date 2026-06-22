import { useCallback } from "react"
import { tryHandleDomExitCommand } from "./command-dispatch/handle-dom-exit"
import { tryHandleDomListCommand } from "./command-dispatch/handle-dom"
import { dispatchFallbackCommand, tryHandleHelpCommand } from "./command-dispatch/handle-fallback"
import { tryHandleGroupNewCommand } from "./command-dispatch/handle-group"
import { tryHandleNavEnterCommand } from "./command-dispatch/handle-nav-enter"
import { tryHandleNavExitCommand } from "./command-dispatch/handle-nav-exit"
import { tryHandleSearchExitCommand } from "./command-dispatch/handle-search-exit"
import { tryHandleSearchListCommand } from "./command-dispatch/handle-search"
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
  tryHandleDomListCommand
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

    const ctx: CommandDispatchContext = {
      deps,
      trimmed,
      rawLine,
      locale: deps.uiSettings.locale
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
