import { useCallback } from "react"
import { incrementalPickerMatchMode, resolveImeTokenPicker } from "../../command-line"
import { resolveActiveCommandSegment } from "../../command-line/compound/active-segment.ts"
import { isJobHandleActive, type BmxtJobHandle } from "../../job"
import { listTabsMoveUrlCandidates, tabsMoveUrlCompletionZone } from "../../tabs/input"
import type { SessionCandidatePanelVariant } from "../../session"
import type { PaneFocusTarget } from "../../side-picker/panel/pane-focus-nav"
import type { SearchListPickerState } from "../../search/search-list-picker-input"
import type { TokenPickerModel } from "../token-picker-panel"
import type { TabPickerState } from "../../side-picker/session/tab-picker-state"
import { logBmxtKey } from "../../debug/key-log"
import { buildFirstTierPrependPickLine, isFirstTierPrependPick } from "../../command-line/first-token-insert.ts"
import { shouldAutoSubmitAfterTokenPick, shouldSubmitLoneFirstTokenFromPicker } from "./bmxt-shell-prompt-helpers"
import { moveNavReloadTabBlockCaret, deleteNavReloadTabBlockAtCursor, deleteNavReloadTabBlockForwardAtCursor } from "../../nav/nav-reload-tab-token"
import { lockedPrefixBlocksDelete } from "./prompt-locked-prefix"

export type UseShellKeyboardOptions = {
  navPageTyping: boolean
  navTypingMultiline: boolean
  promptPaneFocused: boolean
  sessionNameTypingRef: React.MutableRefObject<boolean>
  mode: "normal" | "isearch"
  history: string[]
  histNavIndex: number
  histDraft: string
  iSearchMatches: string[]
  iSearchSnapshot: string
  iSearchCycle: number
  navArmed: boolean
  isFocusedPane: boolean
  paneFocus: PaneFocusTarget
  navKeyboardEnabled: boolean
  navTypingMode: boolean
  navMenuOpen: boolean
  navTextSelPicking: boolean
  navTextSelDone: boolean
  navTextSelPhase: string
  tabPicker: TabPickerState | null
  sidePickerOpen: boolean
  sessionId: string
  lineRef: React.MutableRefObject<string>
  cursorRef: React.MutableRefObject<number>
  paneFocusRef: React.MutableRefObject<PaneFocusTarget>
  tabPressSeqRef: React.MutableRefObject<number>
  allowEmptyFirstPickerSyncRef: React.MutableRefObject<boolean>
  tabPickerOpenRequestRef: React.MutableRefObject<boolean>
  imeTokenPickerDismissedRef: React.MutableRefObject<boolean>
  sessionListPickerDismissedRef: React.MutableRefObject<boolean>
  completionCandidatesRef: React.MutableRefObject<string[]>
  subCmdPickerRef: React.MutableRefObject<TokenPickerModel | null>
  sessionListPickerHiRef: React.MutableRefObject<number | null>
  sessionListPickerRowsRef: React.MutableRefObject<readonly { sessionId: string }[]>
  sessionPickerVariantRef: React.MutableRefObject<SessionCandidatePanelVariant | null>
  tabPickerRef: React.MutableRefObject<TabPickerState | null>
  searchListPickerRef: React.MutableRefObject<SearchListPickerState | null>
  jobRunner: { getActive: (kind: string) => BmxtJobHandle | undefined }
  setLine: (line: string) => void
  setCursorPos: (pos: number) => void
  setMode: (mode: "normal" | "isearch") => void
  setHistNavIndex: React.Dispatch<React.SetStateAction<number>>
  setHistDraft: (draft: string) => void
  setISearchCycle: React.Dispatch<React.SetStateAction<number>>
  setISearchSnapshot: (snapshot: string) => void
  setSubCmdPicker: React.Dispatch<React.SetStateAction<TokenPickerModel | null>>
  setSessionListPickerHi: React.Dispatch<React.SetStateAction<number | null>>
  skipHistResetRef: React.MutableRefObject<boolean>
  focusPrompt: () => void
  submitLine: () => void
  syncImeTokenPicker: (line: string, pos: number) => void
  dismissImeTokenPicker: () => void
  cancelSearchPageScan: () => void
  closeSessionNameTyping: () => void
  closeSessionListPicker: () => void
  applySessionSwitchPick: (pickHi: number) => void
  switchSessionFromListPicker: (commandLine: string, pickHi: number) => void
  handleToggleNavActive: () => void
  promptLine: () => string
  /** EN: Active immutable prompt prefix (confirm y/n), or null. */
  getPromptLockedPrefix: () => string | null
}

/** EN: Prompt keyboard handling (history, isearch, token/session pickers, submit). */
export function useShellKeyboard(options: UseShellKeyboardOptions) {
  const applyTokenPickIndex = useCallback(
    (idx: number) => {
      options.allowEmptyFirstPickerSyncRef.current = false
      options.imeTokenPickerDismissedRef.current = false
      const s = options.subCmdPickerRef.current
      if (!s) {
        return
      }
      const tok = s.candidates[idx]
      if (!tok) {
        return
      }
      const cur = options.lineRef.current
      const cursor = options.cursorRef.current
      const appendAtEnd = s.tokenStart === s.tokenEnd && s.tokenStart >= cur.length
      const prependFirstCommand = isFirstTierPrependPick(cur, cursor, s.tier)
      let nextLine: string
      let nextPos: number
      if (appendAtEnd) {
        const sep = cur.length > 0 && !/\s$/.test(cur) ? " " : ""
        nextLine = `${cur}${sep}${tok} `
        nextPos = nextLine.length
      } else if (prependFirstCommand) {
        const built = buildFirstTierPrependPickLine(cur, cursor, tok)
        nextLine = built.line
        nextPos = built.cursor
      } else {
        const addTrailing = s.tokenEnd >= cur.length
        nextLine = addTrailing
          ? cur.slice(0, s.tokenStart) + tok + " " + cur.slice(s.tokenEnd)
          : cur.slice(0, s.tokenStart) + tok + cur.slice(s.tokenEnd)
        nextPos = s.tokenStart + tok.length + (addTrailing ? 1 : 0)
      }
      options.lineRef.current = nextLine
      options.setLine(nextLine)
      options.setCursorPos(nextPos)
      options.setHistNavIndex(-1)
      options.tabPressSeqRef.current = 0
      queueMicrotask(() => {
        options.syncImeTokenPicker(nextLine, nextPos)
        const active = resolveActiveCommandSegment(nextLine, nextPos)
        const segmentTrimmed = active.segmentText.trim()
        if (shouldAutoSubmitAfterTokenPick(segmentTrimmed)) {
          options.setSubCmdPicker(null)
          options.submitLine()
        }
      })
      options.focusPrompt()
    },
    [options]
  )

  const exitISearch = useCallback(() => {
    options.allowEmptyFirstPickerSyncRef.current = false
    options.imeTokenPickerDismissedRef.current = false
    options.setMode("normal")
    options.setLine(options.iSearchSnapshot)
    options.setCursorPos(options.iSearchSnapshot.length)
    options.setISearchCycle(0)
    options.setHistNavIndex(-1)
    options.tabPressSeqRef.current = 0
    options.focusPrompt()
  }, [options])

  const enterISearch = useCallback(() => {
    options.allowEmptyFirstPickerSyncRef.current = false
    options.imeTokenPickerDismissedRef.current = false
    options.setISearchSnapshot(options.lineRef.current)
    options.setMode("isearch")
    options.setLine("")
    options.setCursorPos(0)
    options.setISearchCycle(0)
    options.tabPressSeqRef.current = 0
    options.focusPrompt()
  }, [options])

  const applyHistoryLine = useCallback(
    (text: string) => {
      options.allowEmptyFirstPickerSyncRef.current = false
      options.skipHistResetRef.current = true
      options.tabPressSeqRef.current = 0
      options.setLine(text)
      options.setCursorPos(text.length)
    },
    [options]
  )

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (options.navPageTyping) {
        if (e.key === "Tab") {
          e.preventDefault()
          return
        }
        if (
          e.key === "Enter" &&
          !e.nativeEvent.isComposing &&
          !(e.shiftKey && options.navTypingMultiline)
        ) {
          e.preventDefault()
        }
        return
      }

      if (!options.promptPaneFocused) {
        return
      }

      if (options.sessionNameTypingRef.current) {
        if (e.key === "Escape") {
          e.preventDefault()
          options.closeSessionNameTyping()
          return
        }
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault()
          options.submitLine()
          return
        }
      }

      if (e.nativeEvent.isComposing) {
        return
      }

      if (options.sessionListPickerHiRef.current !== null) {
        const rows = options.sessionListPickerRowsRef.current
        const commandLine = options.lineRef.current.trim()
        const pickerVariant = options.sessionPickerVariantRef.current
        if (e.key === "Escape") {
          e.preventDefault()
          options.closeSessionListPicker()
          return
        }
        const digit = /^[1-9]$/.test(e.key) ? Number.parseInt(e.key, 10) : null
        if (digit !== null && digit <= rows.length) {
          e.preventDefault()
          if (pickerVariant === "switch") {
            options.applySessionSwitchPick(digit - 1)
          } else {
            options.switchSessionFromListPicker(commandLine, digit - 1)
          }
          return
        }
        if (e.key === "ArrowUp") {
          e.preventDefault()
          options.setSessionListPickerHi((cur) => {
            const at = cur ?? 0
            const next = rows.length === 0 ? 0 : (at - 1 + rows.length) % rows.length
            options.sessionListPickerHiRef.current = next
            return next
          })
          return
        }
        if (e.key === "ArrowDown") {
          e.preventDefault()
          options.setSessionListPickerHi((cur) => {
            const at = cur ?? 0
            const next = rows.length === 0 ? 0 : (at + 1) % rows.length
            options.sessionListPickerHiRef.current = next
            return next
          })
          return
        }
        if (e.key === "Enter") {
          e.preventDefault()
          const pickHi = options.sessionListPickerHiRef.current ?? 0
          if (pickerVariant === "switch") {
            options.applySessionSwitchPick(pickHi)
          } else {
            options.switchSessionFromListPicker(commandLine, pickHi)
          }
          return
        }
      }

      if (
        e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        (e.key === "c" || e.key === "C") &&
        options.paneFocusRef.current === "search" &&
        options.searchListPickerRef.current?.phase === "loading" &&
        isJobHandleActive(options.jobRunner.getActive("search-list"))
      ) {
        e.preventDefault()
        options.cancelSearchPageScan()
        return
      }

      logBmxtKey("prompt", "keydown", {
        key: e.key,
        code: e.code,
        ctrlKey: e.ctrlKey,
        shiftKey: e.shiftKey,
        altKey: e.altKey,
        metaKey: e.metaKey,
        mode: options.mode,
        tabPickerOpen: Boolean(options.tabPickerRef.current),
        subCmdPickerOpen: Boolean(options.subCmdPickerRef.current)
      })

      const subPick = options.navPageTyping ? null : options.subCmdPickerRef.current
      if (subPick) {
        if (e.key === "Escape") {
          e.preventDefault()
          options.dismissImeTokenPicker()
          return
        }
        if (e.key === "ArrowUp" && !e.ctrlKey && !e.metaKey) {
          e.preventDefault()
          const n = subPick.candidates.length
          if (n === 0) {
            return
          }
          if (subPick.hi === 0) {
            options.dismissImeTokenPicker()
            return
          }
          options.setSubCmdPicker((s) => (s ? { ...s, hi: s.hi - 1 } : null))
          return
        }
        if (e.key === "ArrowDown" && !e.ctrlKey && !e.metaKey) {
          e.preventDefault()
          const n = subPick.candidates.length
          if (n > 0) {
            options.setSubCmdPicker((s) => (s ? { ...s, hi: (s.hi + 1) % n } : null))
          }
          return
        }
        if (e.key === "Tab") {
          e.preventDefault()
          const n = subPick.candidates.length
          if (n > 0) {
            options.setSubCmdPicker((s) => (s ? { ...s, hi: (s.hi + 1) % n } : null))
          }
          return
        }
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault()
          const line = options.promptLine()
          const pos = options.cursorRef.current
          const active = resolveActiveCommandSegment(line, pos)
          const segmentTrimmed = active.segmentText.trim()
          const pickedToken = subPick.candidates[subPick.hi]
          // EN: Hollow / empty candidate list must not swallow Enter (e.g. stale keep-alive).
          if (subPick.candidates.length === 0) {
            options.setSubCmdPicker(null)
            options.submitLine()
            return
          }
          if (shouldAutoSubmitAfterTokenPick(segmentTrimmed)) {
            options.setSubCmdPicker(null)
            options.submitLine()
            return
          }
          if (shouldSubmitLoneFirstTokenFromPicker(segmentTrimmed, subPick.tier, pickedToken)) {
            options.setSubCmdPicker(null)
            options.submitLine()
            return
          }
          applyTokenPickIndex(subPick.hi)
          return
        }
        if (
          e.key.length === 1 &&
          !e.ctrlKey &&
          !e.metaKey &&
          !e.altKey &&
          subPick.candidates.some((tok) => tok.toLowerCase().includes(e.key.toLowerCase()))
        ) {
          return
        }
      }

      if (e.key !== "Tab") {
        options.tabPressSeqRef.current = 0
      }

      if (options.mode === "isearch") {
        if (e.key === "Escape") {
          e.preventDefault()
          exitISearch()
          return
        }
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault()
          options.submitLine()
          return
        }
        if (e.ctrlKey && (e.key === "r" || e.key === "R")) {
          e.preventDefault()
          if (options.iSearchMatches.length > 0) {
            options.setISearchCycle((c) => (c + 1) % options.iSearchMatches.length)
          }
          return
        }
        if (e.key === "ArrowUp" && !e.ctrlKey && !e.metaKey) {
          e.preventDefault()
          if (options.iSearchMatches.length > 0) {
            options.setISearchCycle(
              (c) => (c - 1 + options.iSearchMatches.length) % options.iSearchMatches.length
            )
          }
          return
        }
        if (e.key === "ArrowDown" && !e.ctrlKey && !e.metaKey) {
          e.preventDefault()
          if (options.iSearchMatches.length > 0) {
            options.setISearchCycle((c) => (c + 1) % options.iSearchMatches.length)
          }
          return
        }
        if (e.key === "Tab") {
          e.preventDefault()
          return
        }
        return
      }

      if (e.ctrlKey && (e.key === "r" || e.key === "R")) {
        e.preventDefault()
        enterISearch()
        return
      }

      if (e.key === "Alt" && options.navArmed && options.isFocusedPane && options.paneFocus === "terminal") {
        e.preventDefault()
        if (options.navTypingMode) {
          return
        }
        if (!e.repeat) {
          options.handleToggleNavActive()
        }
        return
      }

      if (
        options.navKeyboardEnabled ||
        options.navTypingMode ||
        options.navMenuOpen ||
        options.navTextSelPicking ||
        options.navTextSelDone
      ) {
        if (
          e.key === "Enter" ||
          e.key === "ArrowUp" ||
          e.key === "ArrowDown" ||
          e.key === "ArrowLeft" ||
          e.key === "ArrowRight" ||
          e.key === "Backspace" ||
          e.key === "Delete" ||
          e.key === "Tab" ||
          e.key === "Home" ||
          e.key === "End" ||
          (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey)
        ) {
          return
        }
      }

      if (e.key === "Tab") {
        // EN: Tab is completion-only in the prompt — never move browser/page focus
        //     (critical for the float iframe, which would otherwise tab out to the host page).
        e.preventDefault()
        if (options.getPromptLockedPrefix()) {
          return
        }
        options.imeTokenPickerDismissedRef.current = false
        options.sessionListPickerDismissedRef.current = false
        const curLn = options.lineRef.current
        const pos = options.cursorRef.current
        const muZone = tabsMoveUrlCompletionZone(curLn, pos)
        if (muZone) {
          void (async () => {
            const cands = await listTabsMoveUrlCandidates(muZone.prefix)
            if (cands.length === 0) {
              return
            }
            const idx = options.tabPressSeqRef.current % cands.length
            options.tabPressSeqRef.current += 1
            const rep = cands[idx]!
            const newLine =
              curLn.slice(0, muZone.urlStart) + rep + curLn.slice(muZone.tokenEnd)
            options.setHistNavIndex(-1)
            options.setLine(newLine)
            options.setCursorPos(muZone.urlStart + rep.length)
          })()
          return
        }
        if (curLn.trim() === "") {
          options.allowEmptyFirstPickerSyncRef.current = true
          options.tabPickerOpenRequestRef.current = true
          options.syncImeTokenPicker(curLn, pos)
          return
        }
        const imePick = resolveImeTokenPicker(curLn, pos, options.completionCandidatesRef.current, {
          emptyFirstPrefixShowsAll: true
        })
        if (imePick && imePick.candidates.length > 0) {
          options.tabPressSeqRef.current = 0
          options.tabPickerOpenRequestRef.current = true
          options.syncImeTokenPicker(curLn, pos)
          return
        }
        return
      }

      if (e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
          return
        }
      }

      const lockedPrefix = options.getPromptLockedPrefix()

      if (e.key === "ArrowUp" && !options.navKeyboardEnabled && !options.navTypingMode) {
        if (lockedPrefix) {
          e.preventDefault()
          return
        }
        if (
          options.sessionListPickerHiRef.current !== null ||
          options.sessionNameTypingRef.current
        ) {
          return
        }
        e.preventDefault()
        if (options.history.length === 0) {
          return
        }
        if (options.histNavIndex === -1) {
          options.setHistDraft(options.lineRef.current)
          const idx = options.history.length - 1
          options.setHistNavIndex(idx)
          applyHistoryLine(options.history[idx] ?? "")
          return
        }
        if (options.histNavIndex > 0) {
          const next = options.histNavIndex - 1
          options.setHistNavIndex(next)
          applyHistoryLine(options.history[next] ?? "")
        }
        return
      }

      if (e.key === "ArrowDown" && !options.navKeyboardEnabled && !options.navTypingMode) {
        if (lockedPrefix) {
          e.preventDefault()
          return
        }
        if (
          options.sessionListPickerHiRef.current !== null ||
          options.sessionNameTypingRef.current
        ) {
          return
        }
        e.preventDefault()
        if (options.histNavIndex === -1) {
          return
        }
        if (options.histNavIndex < options.history.length - 1) {
          const next = options.histNavIndex + 1
          options.setHistNavIndex(next)
          applyHistoryLine(options.history[next] ?? "")
          return
        }
        options.setHistNavIndex(-1)
        applyHistoryLine(options.histDraft)
        return
      }

      if (
        lockedPrefix &&
        lockedPrefix.length > 0 &&
        (e.key === "Home" || e.key === "ArrowLeft") &&
        !e.altKey &&
        !e.metaKey &&
        !e.ctrlKey &&
        options.mode === "normal" &&
        options.promptPaneFocused &&
        !options.navPageTyping
      ) {
        const pos = options.cursorRef.current
        if (e.key === "Home" || pos <= lockedPrefix.length) {
          e.preventDefault()
          options.setCursorPos(lockedPrefix.length)
          options.syncImeTokenPicker(options.lineRef.current, lockedPrefix.length)
          return
        }
      }

      if (
        (e.key === "Backspace" || e.key === "Delete") &&
        !e.altKey &&
        !e.metaKey &&
        !e.ctrlKey &&
        options.mode === "normal" &&
        options.promptPaneFocused &&
        !options.navPageTyping &&
        !options.navKeyboardEnabled &&
        !options.navTypingMode &&
        !options.navMenuOpen &&
        options.sessionListPickerHiRef.current === null &&
        !options.sessionNameTypingRef.current &&
        options.subCmdPickerRef.current === null
      ) {
        const line = options.lineRef.current
        const pos = options.cursorRef.current
        if (
          lockedPrefix &&
          lockedPrefix.length > 0 &&
          lockedPrefixBlocksDelete(
            lockedPrefix,
            pos,
            pos,
            e.key === "Backspace" ? "deleteContentBackward" : "deleteContentForward"
          )
        ) {
          e.preventDefault()
          options.setCursorPos(lockedPrefix.length)
          return
        }
        const blocked =
          e.key === "Backspace"
            ? deleteNavReloadTabBlockAtCursor(line, pos)
            : deleteNavReloadTabBlockForwardAtCursor(line, pos)
        if (blocked) {
          e.preventDefault()
          options.lineRef.current = blocked.line
          options.setHistNavIndex(-1)
          options.tabPressSeqRef.current = 0
          options.setLine(blocked.line)
          options.setCursorPos(blocked.cursor)
          options.syncImeTokenPicker(blocked.line, blocked.cursor)
          return
        }
      }

      if (
        (e.key === "ArrowLeft" || e.key === "ArrowRight") &&
        !e.altKey &&
        !e.metaKey &&
        !e.ctrlKey &&
        options.mode === "normal" &&
        options.promptPaneFocused &&
        !options.navPageTyping &&
        !options.navKeyboardEnabled &&
        !options.navTypingMode &&
        !options.navMenuOpen &&
        options.sessionListPickerHiRef.current === null &&
        !options.sessionNameTypingRef.current &&
        options.subCmdPickerRef.current === null
      ) {
        const direction: -1 | 1 = e.key === "ArrowRight" ? 1 : -1
        const line = options.lineRef.current
        const pos = options.cursorRef.current
        const next = moveNavReloadTabBlockCaret(line, pos, direction)
        if (next !== null && next !== pos) {
          e.preventDefault()
          options.setCursorPos(next)
          options.syncImeTokenPicker(line, next)
          return
        }
      }

      if (
        e.key === "Enter" &&
        !e.shiftKey &&
        !options.navKeyboardEnabled &&
        !options.navTypingMode &&
        !options.navMenuOpen &&
        !options.navTextSelPicking &&
        !options.navTextSelDone &&
        options.sessionListPickerHiRef.current === null &&
        !options.sessionNameTypingRef.current
      ) {
        e.preventDefault()
        options.submitLine()
      }
    },
    [applyHistoryLine, applyTokenPickIndex, enterISearch, exitISearch, options]
  )

  return {
    onKeyDown,
    applyTokenPickIndex,
    enterISearch,
    exitISearch,
    applyHistoryLine
  }
}
