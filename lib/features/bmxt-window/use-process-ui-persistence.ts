import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react"
import type { PaneFocusTarget } from "../side-picker/panel/pane-focus-nav"
import { pruneSessionPickersMap } from "../side-picker/session/session-pickers"
import type { SessionPickersByLeaf } from "../side-picker/session/session-pickers"
import { PROCESS_UI_STATE_KEY } from "../extension-storage/keys"
import type { DetailBarId } from "./detail-bar-focus"
import type { ModeToolbarId } from "./mode-toolbar-order"
import {
  readProcessUiStateFromStorage,
  rebuildSessionPickersFromStorage,
  serializeProcessUiState,
  writeProcessUiStateToStorage
} from "./process-ui-state-storage"

const PERSIST_DEBOUNCE_MS = 250

function pruneLeafRecord<T>(prev: Record<string, T>, validLeafIds: readonly string[]): Record<string, T> {
  let changed = false
  const next = { ...prev }
  for (const leafId of Object.keys(next)) {
    if (!validLeafIds.includes(leafId)) {
      delete next[leafId]
      changed = true
    }
  }
  return changed ? next : prev
}

export function useProcessUiPersistence(
  validLeafIds: readonly string[],
  enabled: boolean
): {
  pickersBySession: SessionPickersByLeaf
  setPickersBySession: Dispatch<SetStateAction<SessionPickersByLeaf>>
  paneFocusByLeaf: Record<string, PaneFocusTarget>
  setPaneFocusForLeaf: (sessionId: string, target: PaneFocusTarget) => void
  detailBarIdByLeaf: Record<string, DetailBarId | null>
  setDetailBarIdForLeaf: (sessionId: string, update: SetStateAction<DetailBarId | null>) => void
  modeToolbarOrderByLeaf: Record<string, ModeToolbarId[]>
  setModeToolbarOrderForLeaf: (
    sessionId: string,
    update: SetStateAction<ModeToolbarId[]>
  ) => void
  navArmedByLeaf: Record<string, boolean>
  setNavArmedForLeaf: (sessionId: string, armed: boolean) => void
  processUiReady: boolean
} {
  const [pickersBySession, setPickersBySession] = useState<SessionPickersByLeaf>({})
  const [paneFocusByLeaf, setPaneFocusByLeaf] = useState<Record<string, PaneFocusTarget>>({})
  const [detailBarIdByLeaf, setDetailBarIdByLeaf] = useState<Record<string, DetailBarId | null>>({})
  const [modeToolbarOrderByLeaf, setModeToolbarOrderByLeaf] = useState<
    Record<string, ModeToolbarId[]>
  >({})
  const [navArmedByLeaf, setNavArmedByLeaf] = useState<Record<string, boolean>>({})
  const [processUiReady] = useState(true)

  const pickersRef = useRef(pickersBySession)
  const paneFocusRef = useRef(paneFocusByLeaf)
  const detailBarIdRef = useRef(detailBarIdByLeaf)
  const modeToolbarOrderRef = useRef(modeToolbarOrderByLeaf)
  const navArmedRef = useRef(navArmedByLeaf)
  const validLeafIdsRef = useRef(validLeafIds)
  pickersRef.current = pickersBySession
  paneFocusRef.current = paneFocusByLeaf
  detailBarIdRef.current = detailBarIdByLeaf
  modeToolbarOrderRef.current = modeToolbarOrderByLeaf
  navArmedRef.current = navArmedByLeaf
  validLeafIdsRef.current = validLeafIds

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const stored = await readProcessUiStateFromStorage()
      if (cancelled) {
        return
      }
      if (!stored) {
        return
      }
      const rebuilt = await rebuildSessionPickersFromStorage(stored)
      if (!cancelled) {
        setPickersBySession(rebuilt.pickersBySession)
        setPaneFocusByLeaf(rebuilt.paneFocusByLeaf)
        setDetailBarIdByLeaf(rebuilt.detailBarIdByLeaf)
        setModeToolbarOrderByLeaf(rebuilt.modeToolbarOrderByLeaf)
        setNavArmedByLeaf(rebuilt.navArmedByLeaf)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!processUiReady) {
      return
    }
    const onChange: Parameters<typeof chrome.storage.onChanged.addListener>[0] = (
      changes,
      area
    ) => {
      if (area !== "local") {
        return
      }
      const proc = changes[PROCESS_UI_STATE_KEY]
      if (proc && proc.newValue === undefined) {
        setPickersBySession({})
        setPaneFocusByLeaf({})
        setDetailBarIdByLeaf({})
        setModeToolbarOrderByLeaf({})
        setNavArmedByLeaf({})
      }
    }
    chrome.storage.onChanged.addListener(onChange)
    return () => chrome.storage.onChanged.removeListener(onChange)
  }, [processUiReady])

  useEffect(() => {
    if (validLeafIds.length === 0) {
      return
    }
    setPickersBySession((prev) => pruneSessionPickersMap(prev, validLeafIds))
    setPaneFocusByLeaf((prev) => pruneLeafRecord(prev, validLeafIds))
    setDetailBarIdByLeaf((prev) => pruneLeafRecord(prev, validLeafIds))
    setModeToolbarOrderByLeaf((prev) => pruneLeafRecord(prev, validLeafIds))
    setNavArmedByLeaf((prev) => pruneLeafRecord(prev, validLeafIds))
  }, [validLeafIds])

  const persistNow = useCallback(async () => {
    const payload = serializeProcessUiState(
      pickersRef.current,
      paneFocusRef.current,
      validLeafIdsRef.current,
      detailBarIdRef.current,
      modeToolbarOrderRef.current,
      navArmedRef.current
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
  }, [
    detailBarIdByLeaf,
    enabled,
    modeToolbarOrderByLeaf,
    navArmedByLeaf,
    paneFocusByLeaf,
    persistNow,
    pickersBySession,
    processUiReady,
    validLeafIds
  ])

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

  const setDetailBarIdForLeaf = useCallback(
    (sessionId: string, update: SetStateAction<DetailBarId | null>) => {
      setDetailBarIdByLeaf((prev) => {
        const cur = prev[sessionId] ?? null
        const next = typeof update === "function" ? update(cur) : update
        if (next === cur) {
          return prev
        }
        return { ...prev, [sessionId]: next }
      })
    },
    []
  )

  const setModeToolbarOrderForLeaf = useCallback(
    (sessionId: string, update: SetStateAction<ModeToolbarId[]>) => {
      setModeToolbarOrderByLeaf((prev) => {
        const cur = prev[sessionId] ?? []
        const next = typeof update === "function" ? update(cur) : update
        if (next === cur) {
          return prev
        }
        return { ...prev, [sessionId]: next }
      })
    },
    []
  )

  const setNavArmedForLeaf = useCallback((sessionId: string, armed: boolean) => {
    setNavArmedByLeaf((prev) => {
      if ((prev[sessionId] ?? false) === armed) {
        return prev
      }
      return { ...prev, [sessionId]: armed }
    })
  }, [])

  return {
    pickersBySession,
    setPickersBySession,
    paneFocusByLeaf,
    setPaneFocusForLeaf,
    detailBarIdByLeaf,
    setDetailBarIdForLeaf,
    modeToolbarOrderByLeaf,
    setModeToolbarOrderForLeaf,
    navArmedByLeaf,
    setNavArmedForLeaf,
    processUiReady
  }
}
