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
import {
  isPhysicalArrowDown,
  isPhysicalArrowUp,
  isReservedSplitPaneVerticalNav,
  verticalNavDirection
} from "../side-picker/interaction/picker-vertical-nav"
import type { PlainPickerKeyboardExtensions } from "../side-picker/interaction/plain-picker-keyboard-extensions"
import { isPickerAltBlockedChord, isPickerAltOnlyChord } from "../side-picker/preview/picker-alt-chord"
import {
  isPickerCtrlBlockedChord,
  isPickerCtrlOnlyChord
} from "../side-picker/preview/picker-ctrl-chord"
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
import type { SearchPageActiveMode } from "./page-active-setting"

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
  pageActiveMode?: SearchPageActiveMode
  listScrollHintRef?: MutableRefObject<SearchPickerListScrollHint | null>
  baseExtensions?: PlainPickerKeyboardExtensions
}

export type UseSearchPickerAltPreviewKitResult = {
  altKeyHeldRef: MutableRefObject<boolean>
  listScrollHintRef: MutableRefObject<SearchPickerListScrollHint | null>
  mergedExtensions: PlainPickerKeyboardExtensions
  previewNotice: string | null
}

/** EN: Detail view — Ctrl+↑↓ open-tab rows; Alt manual preview; auto preview on ↑↓. */
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
  pageActiveMode = "auto",
  listScrollHintRef: listScrollHintRefOption,
  baseExtensions
}: UseSearchPickerAltPreviewKitOptions): UseSearchPickerAltPreviewKitResult {
  const uiCopy = useUiCopy()
  const altKeyHeldRef = useRef(false)
  const internalListScrollHintRef = useRef<SearchPickerListScrollHint | null>(null)
  const listScrollHintRef = listScrollHintRefOption ?? internalListScrollHintRef
  const [altPreviewTick, setAltPreviewTick] = useState(0)
  const [previewTargetIndices, setPreviewTargetIndices] = useState<number[]>([])
  const [previewTargetsReady, setPreviewTargetsReady] = useState(false)
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
      setPreviewTargetsReady(false)
      return
    }
    let cancelled = false
    setPreviewTargetsReady(false)
    void listSearchDetailPreviewTargetIndices(detailEntry, detailHits).then((indices) => {
      if (!cancelled) {
        setPreviewTargetIndices(indices)
        setPreviewTargetsReady(true)
      }
    })
    return () => {
      cancelled = true
    }
  }, [detailEntry, detailHits, enabled])

  const showPreviewNotice = useCallback(
    (message: string) => {
      if (noticeTimerRef.current !== null) {
        window.clearTimeout(noticeTimerRef.current)
      }
      setPreviewNotice(message)
      noticeTimerRef.current = window.setTimeout(() => {
        setPreviewNotice(null)
        noticeTimerRef.current = null
      }, PREVIEW_NOTICE_MS)
    },
    []
  )

  const showNoPreviewTargetNotice = useCallback(() => {
    showPreviewNotice(uiCopy.t("search.picker.noDetailScrollTarget"))
  }, [showPreviewNotice, uiCopy])

  const showPreviewScrollFailedNotice = useCallback(() => {
    showPreviewNotice(uiCopy.t("search.picker.previewScrollFailed"))
  }, [showPreviewNotice, uiCopy])

  const canPreviewCurrentSelection = useCallback(
    (rowIndex: number): boolean => {
      return canPreviewSearchPickerSelection(
        "detail",
        rowIndex,
        previewTargetIndicesRef.current,
        detailHitsRef.current,
        detailEntryRef.current?.pageMatches,
        previewTargetsReady
      )
    },
    [previewTargetsReady]
  )

  const runPreview = useCallback(
    async (rowIndex?: number): Promise<boolean> => {
      const entry = detailEntryRef.current
      const hits = detailHitsRef.current
      const index = rowIndex ?? hiRef.current
      const hit = hits[index]
      if (!entry || !hit) {
        return false
      }
      return previewSearchPickerDetailHitInBackground(
        entry,
        hit,
        patternRef.current,
        highlightColorsRef.current
      )
    },
    []
  )

  const runPreviewWithNotice = useCallback(
    async (rowIndex?: number) => {
      if (!canPreviewCurrentSelection(rowIndex ?? hiRef.current)) {
        showNoPreviewTargetNotice()
        return
      }
      const ok = await runPreview(rowIndex)
      if (!ok) {
        showPreviewScrollFailedNotice()
      }
    },
    [canPreviewCurrentSelection, runPreview, showNoPreviewTargetNotice, showPreviewScrollFailedNotice]
  )

  const onAltKeyDown = useCallback(() => {
    void runPreviewWithNotice()
  }, [runPreviewWithNotice])

  usePickerAltKeyTracking({
    enabled,
    altKeyHeldRef,
    bumpPreviewTickOnAltDown: pageActiveMode === "manual",
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
    mode: pageActiveMode,
    altKeyHeldRef,
    altPreviewTick,
    previewKey,
    runPreview: () => runPreviewWithNotice()
  })

  const customVerticalNav = useCallback(
    (e: KeyboardEvent): boolean => {
      if (!enabled || commandMode) {
        return false
      }
      const altArrow =
        isPickerAltOnlyChord(e) && (isPhysicalArrowUp(e) || isPhysicalArrowDown(e))
      if (searchMode && !altArrow) {
        return false
      }
      if (isPickerCtrlBlockedChord(e) || isPickerAltBlockedChord(e)) {
        return false
      }
      const ev = e as KeyboardEvent & { isComposing?: boolean }
      if (ev.isComposing || lineCount === 0) {
        return false
      }

      const ctrlArrow =
        isPickerCtrlOnlyChord(e) && (isPhysicalArrowUp(e) || isPhysicalArrowDown(e))
      const navDir = verticalNavDirection(e)

      if (ctrlArrow) {
        const ctrlDir = isPhysicalArrowDown(e) ? "down" : "up"
        pickerStopEvent(e)
        const currentHi = hiRef.current
        const nextHi = adjacentSearchPickerPreviewHi(
          currentHi,
          ctrlDir,
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
        if (pageActiveMode === "auto") {
          void runPreviewWithNotice(nextHi)
        }
        return true
      }

      if (navDir === null) {
        return false
      }
      if (!altArrow && isReservedSplitPaneVerticalNav(e)) {
        return false
      }

      pickerStopEvent(e)

      if (altArrow) {
        altKeyHeldRef.current = true
        const currentHi = hiRef.current
        const nextHi =
          navDir === "down"
            ? Math.min(currentHi + 1, lineCount - 1)
            : Math.max(currentHi - 1, 0)
        hiRef.current = nextHi
        setHi(nextHi)
        const canPreview = canPreviewCurrentSelection(nextHi)
        if (!canPreview) {
          showNoPreviewTargetNotice()
        } else {
          void runPreviewWithNotice(nextHi)
        }
        return true
      }

      const currentHi = hiRef.current
      const nextHi =
        navDir === "down"
          ? Math.min(currentHi + 1, lineCount - 1)
          : Math.max(currentHi - 1, 0)
      hiRef.current = nextHi
      setHi(nextHi)
      if (pageActiveMode === "auto") {
        if (canPreviewCurrentSelection(nextHi)) {
          void runPreviewWithNotice(nextHi)
        }
      }
      return true
    },
    [
      canPreviewCurrentSelection,
      commandMode,
      enabled,
      lineCount,
      pageActiveMode,
      runPreviewWithNotice,
      searchMode,
      setHi,
      showNoPreviewTargetNotice
    ]
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
