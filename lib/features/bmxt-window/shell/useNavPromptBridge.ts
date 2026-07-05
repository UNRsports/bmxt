import { useCallback, useEffect } from "react"
import { flushSync } from "react-dom"
import {
  NAV_ENTER_TYPING_EVENT,
  NAV_EXIT_TYPING_EVENT,
  type NavEnterTypingDetail
} from "../../nav"
import {
  navTypingInsert,
  navTypingShouldPreventLineBreakInput,
  normalizeNavTypingInitialValue,
  sanitizeNavTypingDomValueWithCursor,
  sanitizeNavTypingInsertText
} from "../../nav/nav-prompt-input"
import { isFirstTierPrependPick } from "../../command-line/first-token-insert.ts"
import { wordBounds } from "../../format/word-bounds.ts"

export type UseNavPromptBridgeOptions = {
  navPageTyping: boolean
  navTypingMultiline: boolean
  mode: "normal" | "isearch"
  promptPaneFocused: boolean
  isComposing: boolean
  lineRef: React.MutableRefObject<string>
  cursorRef: React.MutableRefObject<number>
  imeRef: React.RefObject<HTMLTextAreaElement | null>
  isComposingRef: React.MutableRefObject<boolean>
  compositionStartSnapshotRef: React.MutableRefObject<string>
  navPromptSnapRef: React.MutableRefObject<{ line: string; cursor: number } | null>
  skipHistResetRef: React.MutableRefObject<boolean>
  tabPressSeqRef: React.MutableRefObject<number>
  allowEmptyFirstPickerSyncRef: React.MutableRefObject<boolean>
  imeTokenPickerDismissedRef: React.MutableRefObject<boolean>
  sessionListPickerDismissedRef: React.MutableRefObject<boolean>
  setSubCmdPicker: (state: null) => void
  setHistNavIndex: (index: number) => void
  setISearchCycle: (cycle: number) => void
  setLine: (line: string) => void
  setCursorPos: (pos: number) => void
  setIsComposing: (composing: boolean) => void
  setCompositionAnchor: (anchor: number) => void
  syncImeTokenPicker: (line: string, pos: number) => void
  focusPrompt: () => void
  resetNavTranslateSession: () => void
}

/** EN: Nav typing event bridge and prompt composition / input handlers. */
export function useNavPromptBridge(options: UseNavPromptBridgeOptions) {
  const {
    navPageTyping,
    navTypingMultiline,
    mode,
    promptPaneFocused,
    isComposing,
    lineRef,
    cursorRef,
    imeRef,
    isComposingRef,
    compositionStartSnapshotRef,
    navPromptSnapRef,
    skipHistResetRef,
    tabPressSeqRef,
    allowEmptyFirstPickerSyncRef,
    imeTokenPickerDismissedRef,
    sessionListPickerDismissedRef,
    setSubCmdPicker,
    setHistNavIndex,
    setISearchCycle,
    setLine,
    setCursorPos,
    setIsComposing,
    setCompositionAnchor,
    syncImeTokenPicker,
    focusPrompt,
    resetNavTranslateSession
  } = options

  const restoreNavPromptSnap = useCallback(() => {
    const snap = navPromptSnapRef.current
    if (!snap) {
      return
    }
    const ta = imeRef.current
    if (ta) {
      ta.value = snap.line
      ta.selectionStart = snap.cursor
      ta.selectionEnd = snap.cursor
    }
    lineRef.current = snap.line
    setLine(snap.line)
    setCursorPos(snap.cursor)
  }, [cursorRef, imeRef, lineRef, navPromptSnapRef, setCursorPos, setLine])

  useEffect(() => {
    const onEnter = (ev: Event) => {
      const detail = (ev as CustomEvent<NavEnterTypingDetail>).detail
      if (!detail) {
        return
      }
      const ta = imeRef.current
      navPromptSnapRef.current = {
        line: ta?.value ?? lineRef.current,
        cursor: ta?.selectionStart ?? cursorRef.current
      }
      skipHistResetRef.current = true
      tabPressSeqRef.current = 0
      setHistNavIndex(-1)
      setSubCmdPicker(null)
      allowEmptyFirstPickerSyncRef.current = false
      imeTokenPickerDismissedRef.current = false
      isComposingRef.current = false
      compositionStartSnapshotRef.current = ""
      const initial = normalizeNavTypingInitialValue(detail.initialValue, detail.multiline)
      const applyEnter = () => {
        setCompositionAnchor(0)
        setIsComposing(false)
        lineRef.current = initial
        setLine(initial)
        setCursorPos(initial.length)
      }
      flushSync(applyEnter)
      if (ta) {
        ta.value = initial
        ta.setSelectionRange(initial.length, initial.length)
      }
      focusPrompt()
    }
    const onExit = () => {
      isComposingRef.current = false
      compositionStartSnapshotRef.current = ""
      setCompositionAnchor(0)
      setIsComposing(false)
      restoreNavPromptSnap()
      navPromptSnapRef.current = null
      resetNavTranslateSession()
    }
    window.addEventListener(NAV_ENTER_TYPING_EVENT, onEnter)
    window.addEventListener(NAV_EXIT_TYPING_EVENT, onExit)
    return () => {
      window.removeEventListener(NAV_ENTER_TYPING_EVENT, onEnter)
      window.removeEventListener(NAV_EXIT_TYPING_EVENT, onExit)
    }
  }, [
    allowEmptyFirstPickerSyncRef,
    compositionStartSnapshotRef,
    cursorRef,
    focusPrompt,
    imeRef,
    imeTokenPickerDismissedRef,
    isComposingRef,
    lineRef,
    navPromptSnapRef,
    resetNavTranslateSession,
    restoreNavPromptSnap,
    setCompositionAnchor,
    setCursorPos,
    setHistNavIndex,
    setIsComposing,
    setLine,
    setSubCmdPicker,
    skipHistResetRef,
    tabPressSeqRef
  ])

  const applyPromptLine = useCallback(
    (
      nextLine: string,
      nextCursor: number,
      ta?: HTMLTextAreaElement | null,
      opts?: { preserveSelection?: boolean }
    ) => {
      options.lineRef.current = nextLine
      options.setLine(nextLine)
      options.setCursorPos(nextCursor)
      options.syncImeTokenPicker(nextLine, nextCursor)
      if (ta && !opts?.preserveSelection) {
        queueMicrotask(() => {
          ta.setSelectionRange(nextCursor, nextCursor)
        })
      }
    },
    [options]
  )

  const syncPromptFromTextarea = useCallback(
    (ta: HTMLTextAreaElement, opts?: { composing?: boolean; newlineSnapshot?: string }) => {
      let v = ta.value
      let pos = ta.selectionEnd
      if (options.navPageTyping) {
        const snapshot =
          opts?.newlineSnapshot ??
          (opts?.composing ? options.compositionStartSnapshotRef.current : options.lineRef.current)
        const sanitized = sanitizeNavTypingDomValueWithCursor(
          v,
          pos,
          options.navTypingMultiline,
          snapshot
        )
        v = sanitized.value
        pos = sanitized.cursor
        if (v !== ta.value) {
          ta.value = v
          if (!opts?.composing) {
            ta.setSelectionRange(pos, pos)
          }
        }
      }
      applyPromptLine(v, pos, ta, { preserveSelection: opts?.composing })
    },
    [applyPromptLine, options.navPageTyping, options.navTypingMultiline, options]
  )

  const syncPromptFromTextareaForComposition = useCallback(
    (ta: HTMLTextAreaElement, opts: { composing: boolean; newlineSnapshot?: string }) => {
      const run = () => {
        syncPromptFromTextarea(ta, opts)
      }
      if (options.navPageTyping) {
        flushSync(run)
      } else {
        run()
      }
    },
    [options.navPageTyping, syncPromptFromTextarea]
  )

  const applyNavTypingMutation = useCallback(
    (ta: HTMLTextAreaElement, nextLine: string, nextCursor: number) => {
      options.setHistNavIndex(-1)
      options.tabPressSeqRef.current = 0
      applyPromptLine(nextLine, nextCursor, ta)
    },
    [applyPromptLine, options]
  )

  const onImeInput = useCallback(
    (e: React.FormEvent<HTMLTextAreaElement>) => {
      if (!options.promptPaneFocused) {
        return
      }
      options.allowEmptyFirstPickerSyncRef.current = false
      options.sessionListPickerDismissedRef.current = false
      if (options.skipHistResetRef.current) {
        options.skipHistResetRef.current = false
      } else if (!options.navPageTyping || options.isComposingRef.current) {
        options.setHistNavIndex(-1)
      }
      options.tabPressSeqRef.current = 0
      if (options.mode === "isearch") {
        options.setISearchCycle(0)
      }
      if (options.navPageTyping) {
        if (options.isComposingRef.current) {
          syncPromptFromTextareaForComposition(e.currentTarget, { composing: true })
        } else {
          syncPromptFromTextarea(e.currentTarget, { composing: false })
        }
        return
      }
      syncPromptFromTextarea(e.currentTarget, { composing: options.isComposingRef.current })
    },
    [options, syncPromptFromTextarea, syncPromptFromTextareaForComposition]
  )

  const onImeSelect = useCallback(() => {
    if (!options.promptPaneFocused) {
      return
    }
    const ta = options.imeRef.current
    if (!ta || options.isComposing) {
      return
    }
    const pos = ta.selectionEnd
    options.setCursorPos(pos)
    options.syncImeTokenPicker(ta.value, pos)
  }, [options])

  const onBeforeInput = useCallback(
    (e: React.FormEvent<HTMLTextAreaElement>) => {
      if (options.isComposingRef.current) {
        return
      }
      const ta = e.currentTarget
      const native = e.nativeEvent as InputEvent

      if (options.navPageTyping) {
        const shift = (native as InputEvent & { getModifierState(key: string): boolean }).getModifierState(
          "Shift"
        )
        if (navTypingShouldPreventLineBreakInput(native.inputType, shift, options.navTypingMultiline)) {
          e.preventDefault()
          return
        }
        if (native.inputType === "insertLineBreak" || native.inputType === "insertParagraph") {
          e.preventDefault()
          const chunk = sanitizeNavTypingInsertText("\n", shift, options.navTypingMultiline)
          if (!chunk) {
            return
          }
          const { next, cursor } = navTypingInsert(
            options.lineRef.current,
            ta.selectionStart,
            ta.selectionEnd,
            chunk
          )
          applyNavTypingMutation(ta, next, cursor)
        }
        return
      }

      if (
        !options.promptPaneFocused ||
        options.mode === "isearch" ||
        native.inputType !== "insertText" ||
        !native.data ||
        native.data.length === 0 ||
        /\s/.test(native.data)
      ) {
        return
      }

      const start = ta.selectionStart
      const end = ta.selectionEnd
      if (start !== end) {
        return
      }

      const line = options.lineRef.current
      const [wordStart] = wordBounds(line, start)
      const prefix = line.slice(wordStart, start)
      if (
        start !== wordStart ||
        prefix.length > 0 ||
        !isFirstTierPrependPick(line, start, "first")
      ) {
        return
      }

      e.preventDefault()
      const next = line.slice(0, start) + native.data + " " + line.slice(start)
      const nextCursor = start + native.data.length
      options.setHistNavIndex(-1)
      options.tabPressSeqRef.current = 0
      applyPromptLine(next, nextCursor, ta)
    },
    [applyNavTypingMutation, applyPromptLine, options]
  )

  const onPaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      if (!options.promptPaneFocused) {
        return
      }
      e.preventDefault()
      options.allowEmptyFirstPickerSyncRef.current = false
      const ta = e.currentTarget
      const start = ta.selectionStart
      const end = ta.selectionEnd
      const raw = e.clipboardData.getData("text/plain")
      const t = options.navPageTyping && options.navTypingMultiline ? raw : raw.replace(/[\r\n]+/g, " ")
      const curLn = options.lineRef.current
      const next = curLn.slice(0, start) + t + curLn.slice(end)
      options.setHistNavIndex(-1)
      options.tabPressSeqRef.current = 0
      if (options.mode === "isearch") {
        options.setISearchCycle(0)
      }
      options.lineRef.current = next
      options.setLine(next)
      options.setCursorPos(start + t.length)
      options.syncImeTokenPicker(next, start + t.length)
    },
    [options]
  )

  const onCompositionStart = useCallback(
    (ev: React.CompositionEvent<HTMLTextAreaElement>) => {
      const ta = ev.currentTarget
      const snapshot = options.lineRef.current
      if (options.navPageTyping && ev.data === "" && ta.value === snapshot) {
        options.setCompositionAnchor(ta.selectionStart)
        return
      }
      options.isComposingRef.current = true
      options.compositionStartSnapshotRef.current = snapshot
      const anchor = ta.selectionStart
      const run = () => {
        options.setIsComposing(true)
        options.setCompositionAnchor(anchor)
        syncPromptFromTextarea(ta, { composing: true, newlineSnapshot: snapshot })
      }
      if (options.navPageTyping) {
        flushSync(run)
      } else {
        run()
      }
    },
    [options, syncPromptFromTextarea]
  )

  const onCompositionUpdate = useCallback(
    (ev: React.CompositionEvent<HTMLTextAreaElement>) => {
      const ta = ev.currentTarget
      if (options.navPageTyping && !options.isComposingRef.current && ev.data.length > 0) {
        options.isComposingRef.current = true
        options.compositionStartSnapshotRef.current = options.lineRef.current
        const snapshot = options.compositionStartSnapshotRef.current
        flushSync(() => {
          options.setIsComposing(true)
          options.setCompositionAnchor(ta.selectionStart)
          syncPromptFromTextarea(ta, { composing: true, newlineSnapshot: snapshot })
        })
        return
      }
      syncPromptFromTextareaForComposition(ta, {
        composing: true,
        newlineSnapshot: options.compositionStartSnapshotRef.current
      })
    },
    [options, syncPromptFromTextarea, syncPromptFromTextareaForComposition]
  )

  const onCompositionEnd = useCallback(
    (ev: React.CompositionEvent<HTMLTextAreaElement>) => {
      const ta = ev.currentTarget
      const snapshot = options.compositionStartSnapshotRef.current
      const run = () => {
        options.isComposingRef.current = false
        syncPromptFromTextarea(ta, { composing: false, newlineSnapshot: snapshot })
        options.compositionStartSnapshotRef.current = options.lineRef.current
        options.setIsComposing(false)
        options.setCompositionAnchor(0)
        options.allowEmptyFirstPickerSyncRef.current = false
      }
      if (options.navPageTyping) {
        flushSync(run)
      } else {
        run()
      }
    },
    [options, syncPromptFromTextarea]
  )

  return {
    restoreNavPromptSnap,
    applyPromptLine,
    onImeInput,
    onImeSelect,
    onBeforeInput,
    onPaste,
    onCompositionStart,
    onCompositionUpdate,
    onCompositionEnd
  }
}
