import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { promptMirrorSegments } from "../../nav/nav-prompt-input"
import {
  ensureBmxtCore,
  FALLBACK_COMPLETION_CANDIDATES,
  getCompletionCandidates,
  resetCompletionCandidatesCache
} from "../../bmxt-core"
import { matchesForSearch } from "../text-utils"

export type ShellPromptMode = "normal" | "isearch"

export type UseShellPromptCoreOptions = {
  history: string[]
  completionCandidates: string[]
}

/** EN: Prompt line state — mode, cursor, history nav, reverse-i-search, IME refs. */
export function useShellPromptCore(options: UseShellPromptCoreOptions) {
  const [mode, setMode] = useState<ShellPromptMode>("normal")
  const [line, setLine] = useState("")
  /** EN: Caret / selection end (DOM selectionEnd; >= selectionStart). */
  const [cursorPos, setCursorPosState] = useState(0)
  /** EN: Selection start; equals cursorPos when the caret is collapsed. */
  const [selectionStart, setSelectionStart] = useState(0)
  /** EN: Keep Shift+Arrow direction across controlled re-renders. */
  const [selectionDirection, setSelectionDirection] = useState<
    "forward" | "backward" | "none"
  >("none")
  const [isComposing, setIsComposing] = useState(false)
  const [compositionAnchor, setCompositionAnchor] = useState(0)
  const [localCompletion, setLocalCompletion] = useState<string[]>(options.completionCandidates)

  /**
   * EN: Move the caret and collapse any range selection (default for edits / navigation).
   * JA: キャレット移動と同時に範囲選択を解除する（編集・移動の既定）。
   */
  const setCursorPos = useCallback((pos: number) => {
    setCursorPosState(pos)
    setSelectionStart(pos)
    setSelectionDirection("none")
  }, [])

  /**
   * EN: Restore a textarea selection range (mouse drag / Shift+Arrow / Ctrl+A).
   * JA: テキストエリアの範囲選択を保持する（ドラッグ / Shift+矢印 / Ctrl+A）。
   */
  const setPromptSelection = useCallback(
    (
      start: number,
      end: number,
      direction: "forward" | "backward" | "none" = "none"
    ) => {
      const a = Math.max(0, start)
      const b = Math.max(0, end)
      setSelectionStart(Math.min(a, b))
      setCursorPosState(Math.max(a, b))
      setSelectionDirection(a === b ? "none" : direction)
    },
    []
  )

  const [histNavIndex, setHistNavIndex] = useState(-1)
  const [histDraft, setHistDraft] = useState("")
  const skipHistResetRef = useRef(false)

  const [iSearchCycle, setISearchCycle] = useState(0)
  const [iSearchSnapshot, setISearchSnapshot] = useState("")

  const tabPressSeqRef = useRef(0)
  const lineRef = useRef("")
  const cursorRef = useRef(0)
  const navPromptSnapRef = useRef<{ line: string; cursor: number } | null>(null)
  const completionCandidatesRef = useRef<string[]>([])

  const imeRef = useRef<HTMLTextAreaElement>(null)
  const isComposingRef = useRef(false)
  const compositionStartSnapshotRef = useRef("")
  const cursorMirrorCellRef = useRef<HTMLSpanElement>(null)
  const subCmdPickerHostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLocalCompletion(options.completionCandidates)
  }, [options.completionCandidates])

  useEffect(() => {
    completionCandidatesRef.current = localCompletion
  }, [localCompletion])

  useEffect(() => {
    lineRef.current = line
  }, [line])

  useEffect(() => {
    cursorRef.current = cursorPos
  }, [cursorPos])

  useEffect(() => {
    void (async () => {
      try {
        await ensureBmxtCore()
        resetCompletionCandidatesCache()
        setLocalCompletion(getCompletionCandidates())
      } catch {
        setLocalCompletion(FALLBACK_COMPLETION_CANDIDATES)
      }
    })()
  }, [])

  const iSearchMatches = useMemo(
    () => matchesForSearch(options.history, mode === "isearch" ? line : ""),
    [options.history, line, mode]
  )

  const iSearchPreview = iSearchMatches[iSearchCycle]

  useEffect(() => {
    if (iSearchCycle >= iSearchMatches.length && iSearchMatches.length > 0) {
      setISearchCycle(0)
    }
    if (iSearchMatches.length === 0) {
      setISearchCycle(0)
    }
  }, [iSearchMatches.length, iSearchCycle, iSearchMatches])

  useLayoutEffect(() => {
    const ta = imeRef.current
    if (!ta || isComposing) {
      return
    }
    const start = Math.max(0, Math.min(selectionStart, line.length))
    const end = Math.max(0, Math.min(cursorPos, line.length))
    const directionMismatch =
      start !== end && ta.selectionDirection !== selectionDirection
    if (
      ta.selectionStart !== start ||
      ta.selectionEnd !== end ||
      directionMismatch
    ) {
      ta.setSelectionRange(start, end, selectionDirection)
    }
  }, [line, cursorPos, selectionStart, selectionDirection, isComposing])

  const mirror = useMemo(
    () => promptMirrorSegments(line, cursorPos, isComposing, compositionAnchor),
    [line, cursorPos, isComposing, compositionAnchor]
  )

  const promptLine = () => imeRef.current?.value ?? lineRef.current

  return {
    mode,
    setMode,
    line,
    setLine,
    cursorPos,
    selectionStart,
    setCursorPos,
    setPromptSelection,
    isComposing,
    setIsComposing,
    compositionAnchor,
    setCompositionAnchor,
    localCompletion,
    setLocalCompletion,
    histNavIndex,
    setHistNavIndex,
    histDraft,
    setHistDraft,
    skipHistResetRef,
    iSearchCycle,
    setISearchCycle,
    iSearchSnapshot,
    setISearchSnapshot,
    iSearchMatches,
    iSearchPreview,
    tabPressSeqRef,
    lineRef,
    cursorRef,
    navPromptSnapRef,
    completionCandidatesRef,
    imeRef,
    isComposingRef,
    compositionStartSnapshotRef,
    cursorMirrorCellRef,
    subCmdPickerHostRef,
    mirror,
    promptLine
  }
}
