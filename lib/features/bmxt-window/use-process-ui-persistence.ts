/**
 * EN: Process UI state (pickers, pane focus) — in-memory for the BMXt window lifetime.
 * JA: ピッカー列・ペインフォーカスは BMXt ウィンドウ存続中メモリのみ。
 */

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react"
import type { PaneFocusTarget } from "../side-picker/panel/pane-focus-nav"
import { pruneSessionPickersMap } from "../side-picker/session/session-pickers"
import type { SessionPickersByLeaf } from "../side-picker/session/session-pickers"
import { clearTabPickerFoldStateInMemory } from "../tabs/tab-picker-fold-state"
import {
  sessionClearAppliesToHost,
  type BmxtHostKind
} from "./bmxt-host-kind"
import {
  isSessionRuntimeOutboundMessage,
  SESSION_CLEAR_MESSAGE
} from "./terminal-sessions/session-runtime-protocol"
import type { DetailBarId } from "./detail-bar-focus"
import type { ModeToolbarId } from "./mode-toolbar-order"

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
  enabled: boolean,
  hostKind: BmxtHostKind = "popup"
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
  const [processUiReady, setProcessUiReady] = useState(false)

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

  const hostKindRef = useRef(hostKind)
  hostKindRef.current = hostKind

  const resetProcessUiState = useCallback(() => {
    setPickersBySession({})
    setPaneFocusByLeaf({})
    setDetailBarIdByLeaf({})
    setModeToolbarOrderByLeaf({})
    setNavArmedByLeaf({})
    clearTabPickerFoldStateInMemory()
  }, [])

  useEffect(() => {
    setProcessUiReady(true)
  }, [])

  useEffect(() => {
    const onRuntimeMessage: Parameters<typeof chrome.runtime.onMessage.addListener>[0] = (
      message
    ) => {
      if (!isSessionRuntimeOutboundMessage(message)) {
        return
      }
      if (message.type === SESSION_CLEAR_MESSAGE) {
        if (!sessionClearAppliesToHost(message.host, hostKindRef.current)) {
          return
        }
        resetProcessUiState()
      }
    }
    chrome.runtime.onMessage.addListener(onRuntimeMessage)
    return () => chrome.runtime.onMessage.removeListener(onRuntimeMessage)
  }, [resetProcessUiState])

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
