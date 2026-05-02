import type { MutableRefObject, RefObject } from "react"
import type { Dispatch, SetStateAction } from "react"
import { useEffect, useLayoutEffect, useRef } from "react"
import { groupRowKey } from "./tab-picker-keyboard"
import type { BulkSubMode, SelectKind } from "./tab-picker-overlay-types"
import type { TabPickerRow } from "./picker-rows"
import { pickerMarkedCount } from "./use-tab-picker-derived-state"

type PickerGroupChoice = { id: number; windowId: number; label: string }

export function useTabPickerSyncAndLayoutEffects({
  initialHi,
  filterQuery,
  rows,
  visibleRowIndices,
  hi,
  setHi,
  setMoveDestHi,
  groupNewPhase,
  searchMode,
  inputRef,
  groupMetaTitleRef,
  markedKind,
  markedTabIds,
  markedWindowIds,
  markedGroupKeys,
  setMarkedTabIds,
  setMarkedWindowIds,
  setMarkedGroupKeys,
  setBulkSubMode,
  setMarkedKind,
  bulkSubMode,
  moveDestHi,
  rowElRefs,
  groupChoices,
  groupPickIndex,
  shiftRangeAnchorHiRef,
  anchorTabIdRef,
  prevFilterQueryRef,
  prevRowsRef,
  prevBulkSubModeRef
}: {
  initialHi: number
  filterQuery: string
  rows: TabPickerRow[]
  visibleRowIndices: number[]
  hi: number
  setHi: Dispatch<SetStateAction<number>>
  setMoveDestHi: Dispatch<SetStateAction<number>>
  groupNewPhase: "tabs" | "meta"
  searchMode: boolean
  inputRef: RefObject<HTMLTextAreaElement | null>
  groupMetaTitleRef: RefObject<HTMLInputElement | null>
  markedKind: SelectKind | null
  markedTabIds: number[]
  markedWindowIds: number[]
  markedGroupKeys: string[]
  setMarkedTabIds: Dispatch<SetStateAction<number[]>>
  setMarkedWindowIds: Dispatch<SetStateAction<number[]>>
  setMarkedGroupKeys: Dispatch<SetStateAction<string[]>>
  setBulkSubMode: Dispatch<SetStateAction<BulkSubMode | null>>
  setMarkedKind: Dispatch<SetStateAction<SelectKind | null>>
  bulkSubMode: BulkSubMode | null
  moveDestHi: number
  rowElRefs: MutableRefObject<Map<number, HTMLDivElement | null>>
  groupChoices: PickerGroupChoice[]
  groupPickIndex: number
  shiftRangeAnchorHiRef: MutableRefObject<number | null>
  anchorTabIdRef: MutableRefObject<number | null>
  prevFilterQueryRef: MutableRefObject<string>
  prevRowsRef: MutableRefObject<TabPickerRow[]>
  prevBulkSubModeRef: MutableRefObject<BulkSubMode | null>
}): { groupPanelRef: RefObject<HTMLDivElement | null> } {
  const groupPanelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setHi(initialHi)
  }, [initialHi, setHi])

  useLayoutEffect(() => {
    if (visibleRowIndices.length === 0) {
      return
    }

    const structChanged =
      prevFilterQueryRef.current !== filterQuery || prevRowsRef.current !== rows
    prevFilterQueryRef.current = filterQuery
    prevRowsRef.current = rows

    let targetHi = hi

    if (structChanged && anchorTabIdRef.current !== null) {
      const tid = anchorTabIdRef.current
      const rowIdx = rows.findIndex((r) => r.kind === "tab" && r.tabId === tid)
      if (rowIdx >= 0) {
        const mapped = visibleRowIndices.findIndex((ri) => ri === rowIdx)
        if (mapped >= 0) {
          targetHi = mapped
        }
      }
    }

    targetHi = Math.min(Math.max(0, targetHi), visibleRowIndices.length - 1)

    if (targetHi !== hi) {
      setHi(targetHi)
    }

    const ri = visibleRowIndices[targetHi]
    const row = ri !== undefined ? rows[ri] : undefined
    if (row?.kind === "tab") {
      anchorTabIdRef.current = row.tabId
    }

    setMoveDestHi((d) => Math.min(d, visibleRowIndices.length - 1))
  }, [filterQuery, rows, visibleRowIndices, hi, setHi, setMoveDestHi, anchorTabIdRef, prevFilterQueryRef, prevRowsRef])

  useEffect(() => {
    if (groupNewPhase === "meta") {
      return
    }
    const visibleTabs = new Set<number>()
    const visibleWindows = new Set<number>()
    const visibleGroups = new Set<string>()
    for (const ri of visibleRowIndices) {
      const r = rows[ri]
      if (!r) {
        continue
      }
      if (r.kind === "tab") {
        visibleTabs.add(r.tabId)
      } else if (r.kind === "window") {
        visibleWindows.add(r.windowId)
      } else if (r.kind === "group") {
        visibleGroups.add(groupRowKey(r.windowId, r.groupId))
      }
    }
    setMarkedTabIds((m) => m.filter((id) => visibleTabs.has(id)))
    setMarkedWindowIds((m) => m.filter((id) => visibleWindows.has(id)))
    setMarkedGroupKeys((m) => m.filter((k) => visibleGroups.has(k)))
  }, [visibleRowIndices, rows, groupNewPhase, setMarkedGroupKeys, setMarkedTabIds, setMarkedWindowIds])

  const markedCount = pickerMarkedCount(
    markedKind,
    markedTabIds,
    markedWindowIds,
    markedGroupKeys
  )

  useEffect(() => {
    if (markedCount === 0) {
      setBulkSubMode(null)
      setMarkedKind(null)
      shiftRangeAnchorHiRef.current = null
    }
  }, [markedCount, setBulkSubMode, setMarkedKind, shiftRangeAnchorHiRef])

  useEffect(() => {
    if (
      bulkSubMode === "move" &&
      prevBulkSubModeRef.current !== "move" &&
      visibleRowIndices.length > 0
    ) {
      setMoveDestHi(Math.min(hi, visibleRowIndices.length - 1))
    }
    prevBulkSubModeRef.current = bulkSubMode
  }, [bulkSubMode, hi, visibleRowIndices.length, prevBulkSubModeRef, setMoveDestHi])

  useLayoutEffect(() => {
    if (groupNewPhase === "meta") {
      inputRef.current?.blur()
      groupMetaTitleRef.current?.focus()
      return
    }
    inputRef.current?.focus()
  }, [groupNewPhase, searchMode, inputRef, groupMetaTitleRef])

  useLayoutEffect(() => {
    const rowIndex = visibleRowIndices[hi]
    if (rowIndex === undefined) {
      return
    }
    const el = rowElRefs.current.get(rowIndex)
    el?.scrollIntoView({ block: "nearest", behavior: "instant" })
  }, [hi, visibleRowIndices, rowElRefs])

  useLayoutEffect(() => {
    if (bulkSubMode !== "move") {
      return
    }
    const rowIndex = visibleRowIndices[moveDestHi]
    if (rowIndex === undefined) {
      return
    }
    const el = rowElRefs.current.get(rowIndex)
    el?.scrollIntoView({ block: "nearest", behavior: "instant" })
  }, [bulkSubMode, moveDestHi, visibleRowIndices, rowElRefs])

  useLayoutEffect(() => {
    if (bulkSubMode !== "group" || groupChoices.length === 0) {
      return
    }
    const row = groupPanelRef.current?.querySelector<HTMLElement>(
      `[data-bmxt-group-pick="${groupPickIndex}"]`
    )
    row?.scrollIntoView({ block: "nearest", behavior: "instant" })
  }, [bulkSubMode, groupChoices.length, groupPickIndex])

  return { groupPanelRef }
}
