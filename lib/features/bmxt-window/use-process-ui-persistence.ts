/**
 * EN: Process UI state (pickers, pane focus) — in-memory for popup; session-persisted for float.
 * JA: ピッカー列・ペインフォーカス。ポップアップはメモリのみ、フロートはタブ別 session 永続。
 */

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react"
import {
  clearFloatBrowseStateForTab,
  loadFloatBrowseStateForTab,
  patchFloatBrowseStateForTab
} from "../bmxt-float/float-browse-state-storage.ts"
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
  hostKind: BmxtHostKind = "popup",
  floatTabId: number | null = null,
  /**
   * EN: Float must wait for terminal sessions so leaf ids match before hydrate/prune.
   * JA: フロートはセッション ID 確定後にハイドレート／prune する。
   */
  sessionsReady = true
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
  restoredNavActive: boolean
  processUiReady: boolean
  /** EN: Float only — write current leaf browse fields to session storage. */
  flushFloatBrowsePersist: () => Promise<void>
} {
  const [pickersBySession, setPickersBySession] = useState<SessionPickersByLeaf>({})
  const [paneFocusByLeaf, setPaneFocusByLeaf] = useState<Record<string, PaneFocusTarget>>({})
  const [detailBarIdByLeaf, setDetailBarIdByLeaf] = useState<Record<string, DetailBarId | null>>({})
  const [modeToolbarOrderByLeaf, setModeToolbarOrderByLeaf] = useState<
    Record<string, ModeToolbarId[]>
  >({})
  const [navArmedByLeaf, setNavArmedByLeaf] = useState<Record<string, boolean>>({})
  const [restoredNavActive, setRestoredNavActive] = useState(false)
  const [processUiReady, setProcessUiReady] = useState(hostKind !== "float")

  const validLeafIdsRef = useRef(validLeafIds)
  const persistReadyRef = useRef(false)
  validLeafIdsRef.current = validLeafIds

  const hostKindRef = useRef(hostKind)
  hostKindRef.current = hostKind
  const floatTabIdRef = useRef(floatTabId)
  floatTabIdRef.current = floatTabId

  const resetProcessUiState = useCallback(() => {
    setPickersBySession({})
    setPaneFocusByLeaf({})
    setDetailBarIdByLeaf({})
    setModeToolbarOrderByLeaf({})
    setNavArmedByLeaf({})
    setRestoredNavActive(false)
    clearTabPickerFoldStateInMemory()
  }, [])

  useEffect(() => {
    if (hostKind !== "float") {
      setProcessUiReady(true)
      persistReadyRef.current = false
      return
    }
    // EN: Wait for restored session leaf ids — otherwise prune drops navArmed for the real leaf.
    if (!sessionsReady) {
      persistReadyRef.current = false
      setProcessUiReady(false)
      return
    }
    let cancelled = false
    persistReadyRef.current = false
    setProcessUiReady(false)
    const tabId = floatTabId
    if (tabId === null) {
      persistReadyRef.current = true
      setProcessUiReady(true)
      return
    }
    void loadFloatBrowseStateForTab(tabId).then((stored) => {
      if (cancelled) {
        return
      }
      if (stored !== null) {
        setNavArmedByLeaf(stored.navArmedByLeaf)
        setPaneFocusByLeaf(stored.paneFocusByLeaf)
        setDetailBarIdByLeaf(stored.detailBarIdByLeaf)
        setModeToolbarOrderByLeaf(stored.modeToolbarOrderByLeaf)
        setRestoredNavActive(stored.navActive)
      }
      persistReadyRef.current = true
      setProcessUiReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [floatTabId, hostKind, sessionsReady])

  useEffect(() => {
    if (hostKind !== "float" || !processUiReady || !persistReadyRef.current) {
      return
    }
    const tabId = floatTabIdRef.current
    if (tabId === null) {
      return
    }
    // EN: Patch leaf fields only — never rewrite navActive (shell owns that field).
    void patchFloatBrowseStateForTab(tabId, {
      navArmedByLeaf,
      paneFocusByLeaf,
      detailBarIdByLeaf,
      modeToolbarOrderByLeaf
    })
  }, [
    detailBarIdByLeaf,
    hostKind,
    modeToolbarOrderByLeaf,
    navArmedByLeaf,
    paneFocusByLeaf,
    processUiReady
  ])

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
        const tabId = floatTabIdRef.current
        if (hostKindRef.current === "float" && tabId !== null) {
          void clearFloatBrowseStateForTab(tabId)
        }
      }
    }
    chrome.runtime.onMessage.addListener(onRuntimeMessage)
    return () => chrome.runtime.onMessage.removeListener(onRuntimeMessage)
  }, [resetProcessUiState])

  useEffect(() => {
    if (validLeafIds.length === 0) {
      return
    }
    // EN: Float — skip prune until hydrate finished so a temp empty session id
    //     cannot drop restored navArmed keys for the real leaf.
    if (hostKind === "float" && !processUiReady) {
      return
    }
    setPickersBySession((prev) => pruneSessionPickersMap(prev, validLeafIds))
    setPaneFocusByLeaf((prev) => pruneLeafRecord(prev, validLeafIds))
    setDetailBarIdByLeaf((prev) => pruneLeafRecord(prev, validLeafIds))
    setModeToolbarOrderByLeaf((prev) => pruneLeafRecord(prev, validLeafIds))
    setNavArmedByLeaf((prev) => pruneLeafRecord(prev, validLeafIds))
  }, [hostKind, processUiReady, validLeafIds])

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

  const flushFloatBrowsePersist = useCallback(async () => {
    if (hostKindRef.current !== "float") {
      return
    }
    const tabId = floatTabIdRef.current
    if (tabId === null || !persistReadyRef.current) {
      return
    }
    await patchFloatBrowseStateForTab(tabId, {
      navArmedByLeaf,
      paneFocusByLeaf,
      detailBarIdByLeaf,
      modeToolbarOrderByLeaf
    })
  }, [
    detailBarIdByLeaf,
    modeToolbarOrderByLeaf,
    navArmedByLeaf,
    paneFocusByLeaf
  ])

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
    restoredNavActive,
    processUiReady,
    flushFloatBrowsePersist
  }
}
