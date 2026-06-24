import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { promptMirrorSegments } from "../../nav/nav-prompt-input"
import {
  ensureBmxtCore,
  FALLBACK_COMPLETION_CANDIDATES,
  getCompletionCandidates
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
  const [cursorPos, setCursorPos] = useState(0)
  const [isComposing, setIsComposing] = useState(false)
  const [compositionAnchor, setCompositionAnchor] = useState(0)
  const [localCompletion, setLocalCompletion] = useState<string[]>(options.completionCandidates)

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
    if (ta.selectionStart !== cursorPos || ta.selectionEnd !== cursorPos) {
      ta.setSelectionRange(cursorPos, cursorPos)
    }
  }, [line, cursorPos, isComposing])

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
    setCursorPos,
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
