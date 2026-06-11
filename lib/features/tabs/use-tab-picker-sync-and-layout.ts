import type { MutableRefObject, RefObject } from "react"
import type { Dispatch, SetStateAction } from "react"
import { useEffect, useLayoutEffect, useRef } from "react"
import { parsePickerSearchNeedle } from "../side-picker/search/picker-search-needle"
import { groupRowKey } from "./tab-picker-keyboard"
import type { BulkSubMode, EditPanel, SelectKind } from "./tab-picker-overlay-types"
import type { TabPickerRow } from "./picker-rows"
import { tabPickerVisibleHiIndicesMatching } from "./picker-rows"
import { tabPickerRowsStructureKey } from "./tab-picker-rows-structure"
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
  newTabUrlWindowId,
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
  prevRowsStructureKeyRef,
  prevBulkSubModeRef,
  skipNextInitialHiRef,
  isHostPaneFocused,
  editPanel,
  editPanelRef
}: {
  initialHi: number
  filterQuery: string
  rows: TabPickerRow[]
  visibleRowIndices: number[]
  hi: number
  setHi: Dispatch<SetStateAction<number>>
  setMoveDestHi: Dispatch<SetStateAction<number>>
  groupNewPhase: "tabs" | "meta"
  newTabUrlWindowId: number | null
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
  prevRowsStructureKeyRef: MutableRefObject<string>
  prevBulkSubModeRef: MutableRefObject<BulkSubMode | null>
  /** 新規タブ直後の行は anchor 同期に任せ、親の initialHi 上書きを 1 回避ける */
  skipNextInitialHiRef: MutableRefObject<boolean>
  isHostPaneFocused: boolean
  editPanel: EditPanel | null
  editPanelRef: RefObject<HTMLDivElement | null>
}): { groupPanelRef: RefObject<HTMLDivElement | null> } {
  const groupPanelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (skipNextInitialHiRef.current) {
      skipNextInitialHiRef.current = false
      return
    }
    setHi(initialHi)
  }, [initialHi, setHi, skipNextInitialHiRef])

  useLayoutEffect(() => {
    if (visibleRowIndices.length === 0) {
      return
    }

    const rowsStructureKey = tabPickerRowsStructureKey(rows)
    const structChanged =
      prevFilterQueryRef.current !== filterQuery ||
      prevRowsStructureKeyRef.current !== rowsStructureKey
    prevFilterQueryRef.current = filterQuery
    prevRowsStructureKeyRef.current = rowsStructureKey

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

    if (searchMode) {
      const { needle } = parsePickerSearchNeedle(filterQuery)
      if (needle !== "") {
        const matches = tabPickerVisibleHiIndicesMatching(rows, visibleRowIndices, filterQuery)
        if (matches.length > 0) {
          targetHi = matches[0]!
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
  }, [
    filterQuery,
    rows,
    searchMode,
    visibleRowIndices,
    hi,
    setHi,
    setMoveDestHi,
    anchorTabIdRef,
    prevFilterQueryRef,
    prevRowsStructureKeyRef
  ])

  useEffect(() => {
    if (groupNewPhase === "meta" || newTabUrlWindowId !== null || editPanel !== null) {
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
  }, [
    visibleRowIndices,
    rows,
    editPanel,
    groupNewPhase,
    newTabUrlWindowId,
    setMarkedGroupKeys,
    setMarkedTabIds,
    setMarkedWindowIds
  ])

  const markedCount = pickerMarkedCount(
    markedKind,
    markedTabIds,
    markedWindowIds,
    markedGroupKeys
  )

  useEffect(() => {
    const ri = visibleRowIndices[hi]
    const row = ri !== undefined ? rows[ri] : undefined
    const implicitWindowBulk =
      row?.kind === "window" &&
      (bulkSubMode === "close" || bulkSubMode === "newTab")

    if (markedCount === 0 && !implicitWindowBulk && bulkSubMode !== "edit") {
      setBulkSubMode(null)
      setMarkedKind(null)
      shiftRangeAnchorHiRef.current = null
    }
  }, [
    markedCount,
    bulkSubMode,
    hi,
    visibleRowIndices,
    rows,
    setBulkSubMode,
    setMarkedKind,
    shiftRangeAnchorHiRef
  ])

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
    if (!isHostPaneFocused) {
      inputRef.current?.blur()
      groupMetaTitleRef.current?.blur()
      return
    }
    if (
      groupNewPhase === "meta" ||
      newTabUrlWindowId !== null ||
      editPanel?.kind === "windowRename" ||
      editPanel?.kind === "groupRename"
    ) {
      inputRef.current?.blur()
      groupMetaTitleRef.current?.focus()
      return
    }
    inputRef.current?.focus()
  }, [
    editPanel,
    groupNewPhase,
    newTabUrlWindowId,
    searchMode,
    inputRef,
    groupMetaTitleRef,
    isHostPaneFocused
  ])

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

  useLayoutEffect(() => {
    if (editPanel?.kind !== "groupMenu") {
      return
    }
    const row = editPanelRef.current?.querySelector<HTMLElement>(
      `[data-bmxt-edit-pick="${editPanel.pickIndex}"]`
    )
    row?.scrollIntoView({ block: "nearest", behavior: "instant" })
  }, [editPanel, editPanelRef])

  return { groupPanelRef }
}
