import {
  parseSessionListLine,
  parseSessionListPickerLine,
  parseSessionSettingNameBareLine,
  parseSessionSettingNameWithLine,
  parseSessionSwitchByNumberLine,
  parseSessionSwitchPickerLine,
  parseSessionSwitchWithLine,
  resolveSessionRowByDisplayName
} from "../../../session"
import { tryRunPlainListCommand } from "../../../command-line/list-commands"
import { tSession } from "../../../setting/i18n/ns/session"
import {
  clearPrompt,
  recordCommandHistory,
  type CommandDispatchContext,
  type CommandDispatchResult
} from "./types"

export function tryHandleSessionCommand(ctx: CommandDispatchContext): CommandDispatchResult {
  const { deps, trimmed, locale } = ctx

  if (deps.sessionNameTypingRef.current) {
    deps.appendCommandToHistory(trimmed)
    deps.saveSessionDisplayName(trimmed, [])
    return "handled"
  }

  if (parseSessionListPickerLine(trimmed)) {
    const activeIdx = deps.sessionListRows.findIndex((r) => r.isActive)
    const pickHi = deps.sessionListPickerHiRef.current ?? (activeIdx >= 0 ? activeIdx : 0)
    deps.switchSessionFromListPicker(trimmed, pickHi)
    return "handled"
  }

  const sessionList = parseSessionListLine(trimmed)
  if (sessionList !== null && !sessionList.picker) {
    deps.appendCommandToHistory(trimmed)
    clearPrompt(deps)
    recordCommandHistory(deps)
    void (async () => {
      const lines = await tryRunPlainListCommand(trimmed, { locale, deps })
      await deps.appendLogLines([`> ${trimmed}`, ...(lines ?? [])])
      deps.focusPrompt()
    })()
    return "handled"
  }

  if (parseSessionSettingNameBareLine(trimmed)) {
    deps.openSessionNameTyping(trimmed)
    return "handled"
  }

  const sessionSettingName = parseSessionSettingNameWithLine(trimmed)
  if (sessionSettingName !== null) {
    deps.appendCommandToHistory(trimmed)
    deps.saveSessionDisplayName(sessionSettingName, [`> ${trimmed}`])
    return "handled"
  }

  const sessionSwitchName = parseSessionSwitchWithLine(trimmed)
  if (sessionSwitchName !== null) {
    deps.appendCommandToHistory(trimmed)
    clearPrompt(deps)
    recordCommandHistory(deps)
    const row = resolveSessionRowByDisplayName(deps.sessionListRows, sessionSwitchName)
    void (async () => {
      const logLines = [`> ${trimmed}`]
      if (!row) {
        logLines.push(tSession("session.switch.notFound", locale, { name: sessionSwitchName }))
      } else {
        logLines.push(tSession("session.switch.switched", locale, { name: row.displayName }))
        await deps.onActivateSession(row.sessionId)
      }
      await deps.appendLogLines(logLines)
      deps.focusPrompt()
    })()
    return "handled"
  }

  if (parseSessionSwitchPickerLine(trimmed)) {
    deps.sessionListPickerDismissedRef.current = false
    deps.syncImeTokenPicker(deps.lineRef.current, deps.lineRef.current.length)
    deps.focusPrompt()
    return "handled"
  }

  const sessionNumber = parseSessionSwitchByNumberLine(trimmed)
  if (sessionNumber !== null) {
    deps.appendCommandToHistory(trimmed)
    clearPrompt(deps)
    recordCommandHistory(deps)
    const row = deps.sessionListRows[sessionNumber - 1]
    void (async () => {
      const logLines = [`> ${trimmed}`]
      if (!row) {
        logLines.push(
          tSession("session.number.invalid", locale, {
            n: String(sessionNumber),
            max: String(deps.sessionListRows.length)
          })
        )
        await deps.appendLogLines(logLines)
        deps.focusPrompt()
        return
      }
      logLines.push(tSession("session.number.switched", locale, { n: String(sessionNumber) }))
      await deps.appendLogLines(logLines)
      await deps.onActivateSession(row.sessionId)
      deps.focusPrompt()
    })()
    return "handled"
  }

  return "not_handled"
}
