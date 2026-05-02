import type { Dispatch, SetStateAction } from "react"
import { useCallback } from "react"
import type { BulkSubMode, SelectKind } from "./tab-picker-overlay-types"
import {
  reducePickerState,
  type PickerReducerEvent,
  type PickerReducerState
} from "./state-machine"

export function usePickerReducerBridge(
  hi: number,
  moveDestHi: number,
  markedKind: SelectKind | null,
  markedTabIds: number[],
  markedWindowIds: number[],
  markedGroupKeys: string[],
  bulkSubMode: BulkSubMode | null,
  setHi: Dispatch<SetStateAction<number>>,
  setMoveDestHi: Dispatch<SetStateAction<number>>,
  setMarkedKind: Dispatch<SetStateAction<SelectKind | null>>,
  setMarkedTabIds: Dispatch<SetStateAction<number[]>>,
  setMarkedWindowIds: Dispatch<SetStateAction<number[]>>,
  setMarkedGroupKeys: Dispatch<SetStateAction<string[]>>,
  setBulkSubMode: Dispatch<SetStateAction<BulkSubMode | null>>
): {
  applyReducedState: (ev: PickerReducerEvent) => void
  applyReducedStateSequence: (events: PickerReducerEvent[]) => void
  clearMarkedViaReducer: () => void
} {
  const applyReducedState = useCallback(
    (ev: PickerReducerEvent) => {
      const next = reducePickerState(
        {
          hi,
          moveDestHi,
          markedKind,
          markedTabIds,
          markedWindowIds,
          markedGroupKeys,
          bulkSubMode
        },
        ev
      )
      setHi(next.hi)
      setMoveDestHi(next.moveDestHi)
      setMarkedKind(next.markedKind)
      setMarkedTabIds(next.markedTabIds)
      setMarkedWindowIds(next.markedWindowIds)
      setMarkedGroupKeys(next.markedGroupKeys)
      setBulkSubMode(next.bulkSubMode)
    },
    [
      bulkSubMode,
      hi,
      markedGroupKeys,
      markedKind,
      markedTabIds,
      markedWindowIds,
      moveDestHi,
      setBulkSubMode,
      setHi,
      setMarkedGroupKeys,
      setMarkedKind,
      setMarkedTabIds,
      setMarkedWindowIds,
      setMoveDestHi
    ]
  )

  const applyReducedStateSequence = useCallback(
    (events: PickerReducerEvent[]) => {
      let s: PickerReducerState = {
        hi,
        moveDestHi,
        markedKind,
        markedTabIds,
        markedWindowIds,
        markedGroupKeys,
        bulkSubMode
      }
      for (const ev of events) {
        s = reducePickerState(s, ev)
      }
      setHi(s.hi)
      setMoveDestHi(s.moveDestHi)
      setMarkedKind(s.markedKind)
      setMarkedTabIds(s.markedTabIds)
      setMarkedWindowIds(s.markedWindowIds)
      setMarkedGroupKeys(s.markedGroupKeys)
      setBulkSubMode(s.bulkSubMode)
    },
    [
      bulkSubMode,
      hi,
      markedGroupKeys,
      markedKind,
      markedTabIds,
      markedWindowIds,
      moveDestHi,
      setBulkSubMode,
      setHi,
      setMarkedGroupKeys,
      setMarkedKind,
      setMarkedTabIds,
      setMarkedWindowIds,
      setMoveDestHi
    ]
  )

  const clearMarkedViaReducer = useCallback(() => {
    applyReducedState({ kind: "clearMarked" })
  }, [applyReducedState])

  return { applyReducedState, applyReducedStateSequence, clearMarkedViaReducer }
}
