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
  type SearchPageHighlightColors
} from "./preview-search-picker-entry"
import {
  adjacentSearchPickerPreviewHi,
  canPreviewSearchPickerSelection,
  searchPickerPreviewScrollAnimated
} from "./search-picker-preview-nav"
import { listSearchDetailPreviewTargetIndices } from "./search-picker-preview-targets"

const PREVIEW_NOTICE_MS = 3200

export type SearchPickerListScrollHint = {
  animated: boolean
  alignStart?: boolean
}

export type UseSearchPickerAltPreviewKitOptions = {
  enabled: boolean
  isHostPaneFocused: boolean
  pattern: string
  hi: number
  lineCount: number
  setHi: Dispatch<SetStateAction<number>>
  searchMode: boolean
  commandMode: boolean
  detailEntry?: PickerEntry
  detailHits?: readonly SearchEntryDetailHit[]
  highlightColors: SearchPageHighlightColors
  baseExtensions?: PlainPickerKeyboardExtensions
}

export type UseSearchPickerAltPreviewKitResult = {
  altKeyHeldRef: MutableRefObject<boolean>
  listScrollHintRef: MutableRefObject<SearchPickerListScrollHint | null>
  mergedExtensions: PlainPickerKeyboardExtensions
  previewNotice: string | null
}

/** EN: Detail-view page highlight + Alt+↑↓ jump (background tab, dual-color highlights). */
export function useSearchPickerAltPreviewKit({
  enabled,
  isHostPaneFocused,
  pattern,
  hi,
  lineCount,
  setHi,
  searchMode,
  commandMode,
  detailEntry,
  detailHits = [],
  highlightColors,
  baseExtensions
}: UseSearchPickerAltPreviewKitOptions): UseSearchPickerAltPreviewKitResult {
  const uiCopy = useUiCopy()
  const altKeyHeldRef = useRef(false)
  const listScrollHintRef = useRef<SearchPickerListScrollHint | null>(null)
  const [altPreviewTick, setAltPreviewTick] = useState(0)
  const [previewTargetIndices, setPreviewTargetIndices] = useState<number[]>([])
  const [previewNotice, setPreviewNotice] = useState<string | null>(null)
  const noticeTimerRef = useRef<number | null>(null)
  const patternRef = useRef(pattern)
  const hiRef = useRef(hi)
  const detailEntryRef = useRef(detailEntry)
  const detailHitsRef = useRef(detailHits)
  const previewTargetIndicesRef = useRef(previewTargetIndices)
  const highlightColorsRef = useRef(highlightColors)
  patternRef.current = pattern
  hiRef.current = hi
  detailEntryRef.current = detailEntry
  detailHitsRef.current = detailHits
  previewTargetIndicesRef.current = previewTargetIndices
  highlightColorsRef.current = highlightColors

  useEffect(() => {
    if (!enabled) {
      setPreviewTargetIndices([])
      return
    }
    let cancelled = false
    void listSearchDetailPreviewTargetIndices(detailEntry, detailHits).then((indices) => {
      if (!cancelled) {
        setPreviewTargetIndices(indices)
      }
    })
    return () => {
      cancelled = true
    }
  }, [detailEntry, detailHits, enabled])

  const showNoPreviewTargetNotice = useCallback(() => {
    if (noticeTimerRef.current !== null) {
      window.clearTimeout(noticeTimerRef.current)
    }
    setPreviewNotice(uiCopy.t("search.picker.noDetailScrollTarget"))
    noticeTimerRef.current = window.setTimeout(() => {
      setPreviewNotice(null)
      noticeTimerRef.current = null
    }, PREVIEW_NOTICE_MS)
  }, [uiCopy])

  const runPreview = useCallback(async () => {
    const entry = detailEntryRef.current
    const hits = detailHitsRef.current
    const index = hiRef.current
    const hit = hits[index]
    if (!entry || !hit) {
      return
    }
    await previewSearchPickerDetailHitInBackground(
      entry,
      hit,
      patternRef.current,
      highlightColorsRef.current
    )
  }, [])

  const onAltKeyDown = useCallback(() => {
    const currentHi = hiRef.current
    const canPreview = canPreviewSearchPickerSelection(
      "detail",
      currentHi,
      previewTargetIndicesRef.current,
      detailHitsRef.current,
      detailEntryRef.current?.pageMatches
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

  const detailHit = detailHits[hi]
  const previewKey =
    enabled && detailEntry && detailHit
      ? `detail:${hi}:${detailEntry.id}:${detailHit.pageMatchIndex ?? ""}:${pattern}:${highlightColors.hitBg}:${highlightColors.jumpBg}`
      : ""

  usePickerAltPreviewSync({
    enabled: enabled && lineCount > 0,
    isHostPaneFocused,
    mode: "auto",
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
