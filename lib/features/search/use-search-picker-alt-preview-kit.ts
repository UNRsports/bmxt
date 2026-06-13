import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction
} from "react"
import { pickerStopEvent } from "../side-picker/interaction/picker-key-event"
import type { PlainPickerKeyboardExtensions } from "../side-picker/interaction/plain-picker-keyboard-extensions"
import { isPickerAltBlockedChord, isPickerAltOnlyChord } from "../side-picker/preview/picker-alt-chord"
import { pickerAltVerticalNavDirection } from "../side-picker/preview/picker-alt-vertical-nav"
import { usePickerAltKeyTracking } from "../side-picker/preview/use-picker-alt-key-tracking"
import { usePickerAltPreviewSync } from "../side-picker/preview/use-picker-alt-preview-sync"
import type { PickerEntry } from "../side-picker/model/picker-entry"
import { useUiCopy } from "../setting"
import type { SearchEntryDetailHit } from "./search-entry-detail-hits"
import {
  previewSearchPickerDetailHitInBackground,
  previewSearchPickerEntryInBackground
} from "./preview-search-picker-entry"
import {
  adjacentSearchPickerPreviewHi,
  canPreviewSearchPickerSelection,
  searchPickerPreviewScrollAnimated
} from "./search-picker-preview-nav"
import {
  listSearchDetailPreviewTargetIndices,
  listSearchPickerPreviewTargetIndices
} from "./search-picker-preview-targets"

const PREVIEW_NOTICE_MS = 3200

export type SearchPickerAltPreviewView = "results" | "detail"

export type SearchPickerListScrollHint = {
  animated: boolean
  alignStart?: boolean
}

export type UseSearchPickerAltPreviewKitOptions = {
  view: SearchPickerAltPreviewView
  enabled: boolean
  isHostPaneFocused: boolean
  entries: readonly PickerEntry[]
  pattern: string
  matchHi: number
  hi: number
  lineCount: number
  setHi: Dispatch<SetStateAction<number>>
  searchMode: boolean
  commandMode: boolean
  detailEntry?: PickerEntry
  detailHits?: readonly SearchEntryDetailHit[]
  baseExtensions?: PlainPickerKeyboardExtensions
}

export type UseSearchPickerAltPreviewKitResult = {
  altKeyHeldRef: MutableRefObject<boolean>
  listScrollHintRef: MutableRefObject<SearchPickerListScrollHint | null>
  mergedExtensions: PlainPickerKeyboardExtensions
  previewNotice: string | null
}

/** EN: Alt+↑↓ background preview for search results and detail hits (manual / Alt-gated). */
export function useSearchPickerAltPreviewKit({
  view,
  enabled,
  isHostPaneFocused,
  entries,
  pattern,
  matchHi,
  hi,
  lineCount,
  setHi,
  searchMode,
  commandMode,
  detailEntry,
  detailHits = [],
  baseExtensions
}: UseSearchPickerAltPreviewKitOptions): UseSearchPickerAltPreviewKitResult {
  const uiCopy = useUiCopy()
  const altKeyHeldRef = useRef(false)
  const listScrollHintRef = useRef<SearchPickerListScrollHint | null>(null)
  const [altPreviewTick, setAltPreviewTick] = useState(0)
  const [previewTargetIndices, setPreviewTargetIndices] = useState<number[]>([])
  const [previewNotice, setPreviewNotice] = useState<string | null>(null)
  const noticeTimerRef = useRef<number | null>(null)
  const viewRef = useRef(view)
  const entriesRef = useRef(entries)
  const patternRef = useRef(pattern)
  const matchHiRef = useRef(matchHi)
  const hiRef = useRef(hi)
  const detailEntryRef = useRef(detailEntry)
  const detailHitsRef = useRef(detailHits)
  const previewTargetIndicesRef = useRef(previewTargetIndices)
  viewRef.current = view
  entriesRef.current = entries
  patternRef.current = pattern
  matchHiRef.current = matchHi
  hiRef.current = hi
  detailEntryRef.current = detailEntry
  detailHitsRef.current = detailHits
  previewTargetIndicesRef.current = previewTargetIndices

  useEffect(() => {
    if (!enabled) {
      setPreviewTargetIndices([])
      return
    }
    if (view === "detail") {
      let cancelled = false
      void listSearchDetailPreviewTargetIndices(detailEntry, detailHits).then((indices) => {
        if (!cancelled) {
          setPreviewTargetIndices(indices)
        }
      })
      return () => {
        cancelled = true
      }
    }
    if (entries.length === 0) {
      setPreviewTargetIndices([])
      return
    }
    let cancelled = false
    void listSearchPickerPreviewTargetIndices(entries).then((indices) => {
      if (!cancelled) {
        setPreviewTargetIndices(indices)
      }
    })
    return () => {
      cancelled = true
    }
  }, [detailEntry, detailHits, enabled, entries, view])

  const showNoPreviewTargetNotice = useCallback(() => {
    if (noticeTimerRef.current !== null) {
      window.clearTimeout(noticeTimerRef.current)
    }
    const key =
      viewRef.current === "detail"
        ? "search.picker.noDetailScrollTarget"
        : "search.picker.noPreviewTarget"
    setPreviewNotice(uiCopy.t(key))
    noticeTimerRef.current = window.setTimeout(() => {
      setPreviewNotice(null)
      noticeTimerRef.current = null
    }, PREVIEW_NOTICE_MS)
  }, [uiCopy])

  const runPreview = useCallback(async () => {
    if (viewRef.current === "detail") {
      const entry = detailEntryRef.current
      const hits = detailHitsRef.current
      const index = hiRef.current
      const hit = hits[index]
      if (!entry || !hit) {
        return
      }
      await previewSearchPickerDetailHitInBackground(entry, hit, patternRef.current)
      return
    }
    const index = hiRef.current
    const row = entriesRef.current[index]
    if (!row) {
      return
    }
    await previewSearchPickerEntryInBackground(
      row,
      matchHiRef.current,
      patternRef.current
    )
  }, [])

  const onAltKeyDown = useCallback(() => {
    const currentHi = hiRef.current
    const canPreview = canPreviewSearchPickerSelection(
      viewRef.current,
      currentHi,
      previewTargetIndicesRef.current,
      detailHitsRef.current
    )
    if (!canPreview) {
      showNoPreviewTargetNotice()
      return
    }
    void runPreview()
  }, [runPreview, showNoPreviewTargetNotice])

  usePickerAltKeyTracking({
    enabled,
    altKeyHeldRef,
    bumpPreviewTickOnAltDown: true,
    setAltPreviewTick,
    onAltKeyDown
  })

  const resultsEntry = view === "results" ? entries[hi] : undefined
  const detailHit = view === "detail" ? detailHits[hi] : undefined
  const previewKey =
    enabled && view === "results" && resultsEntry
      ? `results:${hi}:${resultsEntry.id}:${matchHi}:${pattern}`
      : enabled && view === "detail" && detailEntry && detailHit
        ? `detail:${hi}:${detailEntry.id}:${detailHit.pageMatchIndex ?? ""}:${pattern}`
        : ""

  usePickerAltPreviewSync({
    enabled: enabled && lineCount > 0,
    isHostPaneFocused,
    mode: "manual",
    altKeyHeldRef,
    altPreviewTick,
    previewKey,
    runPreview
  })

  const customVerticalNav = useCallback(
    (e: KeyboardEvent): boolean => {
      if (!enabled || searchMode || commandMode) {
        return false
      }
      if (isPickerAltBlockedChord(e)) {
        return false
      }
      const navDir = pickerAltVerticalNavDirection(e, altKeyHeldRef)
      if (navDir === null) {
        return false
      }
      const ev = e as KeyboardEvent & { isComposing?: boolean }
      if (ev.isComposing || lineCount === 0) {
        return false
      }
      pickerStopEvent(e)

      if (isPickerAltOnlyChord(e)) {
        const currentHi = hiRef.current
        const nextHi = adjacentSearchPickerPreviewHi(
          currentHi,
          navDir,
          previewTargetIndicesRef.current
        )
        if (nextHi === null) {
          showNoPreviewTargetNotice()
          return true
        }
        if (searchPickerPreviewScrollAnimated(currentHi, nextHi)) {
          listScrollHintRef.current = { animated: true, alignStart: true }
        }
        hiRef.current = nextHi
        setHi(nextHi)
        void runPreview()
        return true
      }

      if (navDir === "down") {
        setHi((h) => Math.min(h + 1, lineCount - 1))
      } else {
        setHi((h) => Math.max(h - 1, 0))
      }
      return true
    },
    [commandMode, enabled, lineCount, runPreview, searchMode, setHi, showNoPreviewTargetNotice]
  )

  const mergedExtensions = useMemo((): PlainPickerKeyboardExtensions => {
    return {
      ...baseExtensions,
      customVerticalNav: enabled
        ? (e) => {
            if (customVerticalNav(e)) {
              return true
            }
            return baseExtensions?.customVerticalNav?.(e) ?? false
          }
        : baseExtensions?.customVerticalNav
    }
  }, [baseExtensions, customVerticalNav, enabled])

  return { altKeyHeldRef, listScrollHintRef, mergedExtensions, previewNotice }
}
