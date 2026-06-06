import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react"
import type { PaneFocusTarget } from "../side-picker/panel/pane-focus-nav"
import { pruneSessionPickersMap } from "../side-picker/session/session-pickers"
import type { SessionPickersByLeaf } from "../side-picker/session/session-pickers"
import {
  readProcessUiStateFromStorage,
  rebuildSessionPickersFromStorage,
  serializeProcessUiState,
  writeProcessUiStateToStorage
} from "./process-ui-state-storage"

const PERSIST_DEBOUNCE_MS = 250

export function useProcessUiPersistence(
  validLeafIds: readonly string[],
  enabled: boolean
): {
  pickersBySession: SessionPickersByLeaf
  setPickersBySession: Dispatch<SetStateAction<SessionPickersByLeaf>>
  paneFocusByLeaf: Record<string, PaneFocusTarget>
  setPaneFocusForLeaf: (sessionId: string, target: PaneFocusTarget) => void
  processUiReady: boolean
} {
  const [pickersBySession, setPickersBySession] = useState<SessionPickersByLeaf>({})
  const [paneFocusByLeaf, setPaneFocusByLeaf] = useState<Record<string, PaneFocusTarget>>({})
  const [processUiReady, setProcessUiReady] = useState(false)

  const pickersRef = useRef(pickersBySession)
  const paneFocusRef = useRef(paneFocusByLeaf)
  const validLeafIdsRef = useRef(validLeafIds)
  pickersRef.current = pickersBySession
  paneFocusRef.current = paneFocusByLeaf
  validLeafIdsRef.current = validLeafIds

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const stored = await readProcessUiStateFromStorage()
      if (cancelled) {
        return
      }
      if (stored) {
        const rebuilt = await rebuildSessionPickersFromStorage(stored)
        if (!cancelled) {
          setPickersBySession(rebuilt.pickersBySession)
          setPaneFocusByLeaf(rebuilt.paneFocusByLeaf)
        }
      }
      if (!cancelled) {
        setProcessUiReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (validLeafIds.length === 0) {
      return
    }
    setPickersBySession((prev) => pruneSessionPickersMap(prev, validLeafIds))
    setPaneFocusByLeaf((prev) => {
      let changed = false
      const next = { ...prev }
      for (const leafId of Object.keys(next)) {
        if (!validLeafIds.includes(leafId)) {
          delete next[leafId]
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [validLeafIds])

  const persistNow = useCallback(async () => {
    const payload = serializeProcessUiState(
      pickersRef.current,
      paneFocusRef.current,
      validLeafIdsRef.current
    )
    await writeProcessUiStateToStorage(payload)
  }, [])

  useEffect(() => {
    if (!processUiReady || !enabled || validLeafIds.length === 0) {
      return
    }
    const timer = window.setTimeout(() => {
      void persistNow()
    }, PERSIST_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [enabled, paneFocusByLeaf, persistNow, pickersBySession, processUiReady, validLeafIds])

  useEffect(() => {
    if (!processUiReady || !enabled) {
      return
    }
    const flush = () => {
      if (validLeafIdsRef.current.length === 0) {
        return
      }
      void persistNow()
    }
    window.addEventListener("pagehide", flush)
    return () => window.removeEventListener("pagehide", flush)
  }, [enabled, persistNow, processUiReady])

  const setPaneFocusForLeaf = useCallback((sessionId: string, target: PaneFocusTarget) => {
    setPaneFocusByLeaf((prev) => {
      if (prev[sessionId] === target) {
        return prev
      }
      return { ...prev, [sessionId]: target }
    })
  }, [])

  return {
    pickersBySession,
    setPickersBySession,
    paneFocusByLeaf,
    setPaneFocusForLeaf,
    processUiReady
  }
}
