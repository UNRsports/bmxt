import { useCallback, useRef } from "react"
import type { TokenPickerModel } from "../token-picker-panel"
import {
  buildSessionSwitchCommandLine,
  sanitizeSessionName,
  type SessionCandidatePanelVariant,
  type SessionListRow
} from "../../session"
import { tSession } from "../../setting/i18n/ns/session"
import type { UiSettings } from "../../setting/settings"

export type UseSessionPromptActionsOptions = {
  sessionId: string
  sessionListRows: readonly SessionListRow[]
  uiLocale: UiSettings["locale"]
  appendCommandToHistory: (cmd: string) => void
  appendLogLines: (lines: string[]) => void | Promise<void>
  onActivateSession: (sessionId: string) => void | Promise<void>
  onSetSessionDisplayName: (sessionId: string, name: string) => void | Promise<void>
  focusPrompt: () => void
  setSubCmdPicker: (state: TokenPickerModel | null) => void
  setLine: (line: string) => void
  setCursorPos: (pos: number) => void
  setHistNavIndex: (index: number) => void
  tabPressSeqRef: React.MutableRefObject<number>
  lineRef: React.MutableRefObject<string>
  imeRef: React.RefObject<HTMLTextAreaElement | null>
  currentSessionDisplayNameRef: React.MutableRefObject<string>
  sessionListPickerDismissedRef: React.MutableRefObject<boolean>
  sessionListRowsRef: React.MutableRefObject<readonly SessionListRow[]>
  sessionListPickerRowsRef: React.MutableRefObject<readonly SessionListRow[]>
  sessionPickerVariantRef: React.MutableRefObject<SessionCandidatePanelVariant | null>
  setSessionListPickerHi: React.Dispatch<React.SetStateAction<number | null>>
  setSessionPickerVariant: React.Dispatch<React.SetStateAction<SessionCandidatePanelVariant | null>>
  setSessionNameTyping: React.Dispatch<React.SetStateAction<boolean>>
  sessionNameTypingRef: React.MutableRefObject<boolean>
  /** EN: Set prompt to a constructed line and re-enter command dispatch. */
  submitConstructedLine: (line: string) => void
}

/** EN: Session list / name prompt actions (switch picker, rename). */
export function useSessionPromptActions(options: UseSessionPromptActionsOptions) {
  const closeSessionNameTyping = useCallback(() => {
    options.setSessionNameTyping(false)
    options.setLine("")
    options.setCursorPos(0)
    options.lineRef.current = ""
    options.setHistNavIndex(-1)
    options.tabPressSeqRef.current = 0
    options.focusPrompt()
  }, [options])

  const openSessionNameTyping = useCallback(
    (commandLine: string) => {
      options.setSubCmdPicker(null)
      options.setSessionListPickerHi(null)
      options.setSessionPickerVariant(null)
      options.sessionListPickerDismissedRef.current = false
      options.appendCommandToHistory(commandLine)
      options.setHistNavIndex(-1)
      options.tabPressSeqRef.current = 0
      const name = options.currentSessionDisplayNameRef.current
      options.setSessionNameTyping(true)
      options.setLine(name)
      options.setCursorPos(name.length)
      options.lineRef.current = name
      void options.appendLogLines([`> ${commandLine}`])
      queueMicrotask(() => {
        const ta = options.imeRef.current
        if (ta) {
          ta.focus({ preventScroll: true })
          ta.setSelectionRange(0, name.length)
        }
      })
    },
    [options]
  )

  const saveSessionDisplayName = useCallback(
    (rawName: string, logLines: string[]) => {
      const sanitized = sanitizeSessionName(rawName)
      options.setSessionNameTyping(false)
      options.setLine("")
      options.setCursorPos(0)
      options.lineRef.current = ""
      options.setHistNavIndex(-1)
      options.tabPressSeqRef.current = 0
      void (async () => {
        const out = [...logLines]
        if (!sanitized) {
          out.push(tSession("session.settingName.invalid", options.uiLocale))
          await options.appendLogLines(out)
          options.focusPrompt()
          return
        }
        await options.onSetSessionDisplayName(options.sessionId, sanitized)
        out.push(tSession("session.settingName.saved", options.uiLocale, { name: sanitized }))
        await options.appendLogLines(out)
        options.focusPrompt()
      })()
    },
    [options]
  )

  const closeSessionListPicker = useCallback(() => {
    options.sessionListPickerDismissedRef.current = true
    options.setSessionListPickerHi(null)
    options.setSessionPickerVariant(null)
    options.focusPrompt()
  }, [options])

  const switchSessionFromListPicker = useCallback(
    (commandLine: string, pickHi: number) => {
      const rows = options.sessionListPickerRowsRef.current
      const row = rows[pickHi]
      const allRows = options.sessionListRowsRef.current
      options.sessionListPickerDismissedRef.current = true
      options.setSessionListPickerHi(null)
      options.setSessionPickerVariant(null)
      options.setHistNavIndex(-1)
      options.tabPressSeqRef.current = 0
      if (!row) {
        const logCommandLine =
          commandLine.trim().length > 0 ? commandLine.trim() : "session -list | browse"
        void options.appendLogLines([
          `> ${logCommandLine}`,
          tSession("session.number.invalid", options.uiLocale, {
            n: String(pickHi + 1),
            max: String(rows.length)
          })
        ])
        options.focusPrompt()
        return
      }
      const nextLine = buildSessionSwitchCommandLine(row, allRows)
      options.submitConstructedLine(nextLine)
    },
    [options]
  )

  const applySessionSwitchPick = useCallback(
    (pickHi: number) => {
      const visibleRows = options.sessionListPickerRowsRef.current
      const allRows = options.sessionListRowsRef.current
      const row = visibleRows[pickHi]
      if (!row) {
        return
      }
      options.sessionListPickerDismissedRef.current = true
      options.setSessionListPickerHi(null)
      options.setSessionPickerVariant(null)
      options.setHistNavIndex(-1)
      options.tabPressSeqRef.current = 0
      const nextLine = buildSessionSwitchCommandLine(row, allRows)
      options.submitConstructedLine(nextLine)
    },
    [options]
  )

  return {
    closeSessionNameTyping,
    openSessionNameTyping,
    saveSessionDisplayName,
    closeSessionListPicker,
    switchSessionFromListPicker,
    applySessionSwitchPick
  }
}
