import {
  createEngineTabPickerRowsRefresh,
  reconcileTabPickerEngines,
  setTabPickerEngineProjectedChangeHandler
} from "../tabs/engine"
import { useTabPickerChromeSync } from "../tabs/use-tab-picker-chrome-sync"
import { setTabPickerFoldActiveSession, pruneTabPickerFoldSessions } from "../tabs/tab-picker-fold-state"
import {
  anyLeafHasPickerOpen,
  sessionPickersOrEmpty,
  setSessionPickerSlot as applySessionPickerSlot,
  type PickerSlotId,
  type SessionPickerState,
  type SessionPickersByLeaf
} from "../side-picker"
import { BmxtShell } from "./bmxt-shell"
import type { PaneFocusTarget } from "../side-picker/panel/pane-focus-nav"
import type { DetailBarId } from "./detail-bar-focus"
import type { ModeToolbarId } from "./mode-toolbar-order"
import { appendLinesToSession } from "./terminal-sessions/state-storage"
import {
  ensureBmxtCore,
  FALLBACK_COMPLETION_CANDIDATES,
  getCompletionCandidates
} from "../bmxt-core"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useCommandHistory } from "./use-command-history"
import { useProcessUiPersistence } from "./use-process-ui-persistence"
import { useTerminalSessions } from "./terminal-sessions/use-terminal-sessions"
import { useVersionUpgradeBanner } from "./use-version-upgrade-banner"
import { UiSettingsProvider, useTerminalAppearance, useUiSettings } from "../setting"

type SessionPaneProps = {
  sessionId: string
  isActive: boolean
  lines: string[]
  history: string[]
  completionCandidates: string[]
  sessionOrder: string[]
  activeSessionId: string
  pickersBySession: SessionPickersByLeaf
  setSessionPickerSlot: <K extends PickerSlotId>(
    forSessionId: string,
    slot: K,
    value: SessionPickerState[K] | ((prev: SessionPickerState[K]) => SessionPickerState[K])
  ) => void
  paneFocusByLeaf: Record<string, PaneFocusTarget>
  setPaneFocusForLeaf: (sessionId: string, target: PaneFocusTarget) => void
  detailBarIdByLeaf: Record<string, DetailBarId | null>
  setDetailBarIdForLeaf: (
    sessionId: string,
    update: import("react").SetStateAction<DetailBarId | null>
  ) => void
  modeToolbarOrderByLeaf: Record<string, ModeToolbarId[]>
  setModeToolbarOrderForLeaf: (
    sessionId: string,
    update: import("react").SetStateAction<ModeToolbarId[]>
  ) => void
  navArmedByLeaf: Record<string, boolean>
  setNavArmedForLeaf: (sessionId: string, armed: boolean) => void
  onActivateSession: (sessionId: string) => Promise<void>
  refreshTabPickerRows: () => Promise<void>
  scheduleTabPickerRowsRefresh: () => void
  postUpgradeBanner: import("./use-version-upgrade-banner").PostUpgradeBanner | null
  appendCommandToHistory: (cmd: string) => void
}

function SessionPaneView({
  sessionId,
  isActive,
  lines,
  history,
  completionCandidates,
  sessionOrder,
  activeSessionId,
  pickersBySession,
  setSessionPickerSlot,
  paneFocusByLeaf,
  setPaneFocusForLeaf,
  detailBarIdByLeaf,
  setDetailBarIdForLeaf,
  modeToolbarOrderByLeaf,
  setModeToolbarOrderForLeaf,
  navArmedByLeaf,
  setNavArmedForLeaf,
  onActivateSession,
  refreshTabPickerRows,
  scheduleTabPickerRowsRefresh,
  postUpgradeBanner,
  appendCommandToHistory
}: SessionPaneProps) {
  const sessionPickers = sessionPickersOrEmpty(pickersBySession, sessionId)
  return (
    <div
      data-bmxt-session-id={sessionId}
      data-bmxt-session-active={isActive ? "" : undefined}
      className={`bmxt-session-viewport${isActive ? " bmxt-session-viewport--active" : " bmxt-session-viewport--hidden"}`}
      aria-hidden={!isActive}>
      <BmxtShell
        sessionId={sessionId}
        isFocusedPane={isActive}
        lines={lines}
        history={history}
        completionCandidates={completionCandidates}
        sessionOrder={sessionOrder}
        activeSessionId={activeSessionId}
        pickersBySession={pickersBySession}
        navArmedByLeaf={navArmedByLeaf}
        onActivateSession={onActivateSession}
        appendLogLines={(newLines) => appendLinesToSession(sessionId, newLines)}
        appendCommandToHistory={appendCommandToHistory}
        sessionPickers={sessionPickers}
        setSessionPickerSlot={setSessionPickerSlot}
        refreshTabPickerRows={refreshTabPickerRows}
        scheduleTabPickerRowsRefresh={scheduleTabPickerRowsRefresh}
        postUpgradeBanner={postUpgradeBanner}
        paneFocus={paneFocusByLeaf[sessionId] ?? "terminal"}
        onPaneFocusChange={(target) => setPaneFocusForLeaf(sessionId, target)}
        detailBarId={detailBarIdByLeaf[sessionId] ?? null}
        onDetailBarIdChange={(update) => setDetailBarIdForLeaf(sessionId, update)}
        modeToolbarOrder={modeToolbarOrderByLeaf[sessionId] ?? []}
        onModeToolbarOrderChange={(update) => setModeToolbarOrderForLeaf(sessionId, update)}
        navArmed={navArmedByLeaf[sessionId] ?? false}
        onNavArmedChange={(armed) => setNavArmedForLeaf(sessionId, armed)}
      />
    </div>
  )
}

export function BmxtTerminal() {
  return (
    <UiSettingsProvider>
      <BmxtTerminalInner />
    </UiSettingsProvider>
  )
}

function BmxtTerminalInner() {
  const { settings } = useUiSettings()
  useTerminalAppearance(settings.appearance)

  const { state, setActiveSession } = useTerminalSessions()
  const { postUpgradeBanner, upgradeBannerReady } = useVersionUpgradeBanner()
  const { history, appendCommandToHistory } = useCommandHistory()
  const [completionCandidates, setCompletionCandidates] = useState<string[]>([])

  const validSessionIds = useMemo(() => state?.order ?? [], [state?.order])

  const {
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
  } = useProcessUiPersistence(validSessionIds, state !== null)

  const pickersBySessionRef = useRef(pickersBySession)
  pickersBySessionRef.current = pickersBySession

  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        await ensureBmxtCore()
        setCompletionCandidates(getCompletionCandidates())
      } catch {
        setCompletionCandidates(FALLBACK_COMPLETION_CANDIDATES)
      }
    })()
  }, [])

  useEffect(() => {
    if (!state) {
      return
    }
    pruneTabPickerFoldSessions(state.order)
    setTabPickerFoldActiveSession(state.activeId)
  }, [state?.activeId, state?.order])

  const setSessionPickerSlot = useCallback(
    <K extends PickerSlotId>(
      forSessionId: string,
      slot: K,
      value: SessionPickerState[K] | ((prev: SessionPickerState[K]) => SessionPickerState[K])
    ) => {
      setPickersBySession((prev) => applySessionPickerSlot(prev, forSessionId, slot, value))
    },
    [setPickersBySession]
  )

  const setPickersBySessionRef = useRef(setPickersBySession)
  setPickersBySessionRef.current = setPickersBySession

  const tabPickerRefreshHandles = useMemo(() => createEngineTabPickerRowsRefresh(), [])

  useEffect(() => {
    setTabPickerEngineProjectedChangeHandler((forSessionId, projected) => {
      setPickersBySessionRef.current((prev) => {
        const cur = sessionPickersOrEmpty(prev, forSessionId)
        if (!cur.tabs) {
          return prev
        }
        return applySessionPickerSlot(prev, forSessionId, "tabs", projected)
      })
    })
    return () => {
      setTabPickerEngineProjectedChangeHandler(null)
    }
  }, [])

  const refreshTabPickerRows = tabPickerRefreshHandles.refreshTabPickerRows
  const scheduleTabPickerRowsRefresh = tabPickerRefreshHandles.scheduleTabPickerRowsRefresh

  const anyPickerOpen = useMemo(
    () => anyLeafHasPickerOpen(pickersBySession),
    [pickersBySession]
  )
  useTabPickerChromeSync(scheduleTabPickerRowsRefresh, anyPickerOpen)

  useEffect(() => {
    reconcileTabPickerEngines(pickersBySession)
  }, [pickersBySession])

  useEffect(() => {
    if (!state) {
      return
    }
    const onKey = (e: KeyboardEvent) => {
      if (!e.ctrlKey || e.metaKey || e.altKey) {
        return
      }
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") {
        return
      }
      const t = e.target as Node | null
      if (!t || !rootRef.current?.contains(t)) {
        return
      }
      if (state.order.length <= 1) {
        return
      }
      e.preventDefault()
      e.stopPropagation()
      const delta = e.key === "ArrowRight" ? 1 : -1
      const idx = state.order.indexOf(state.activeId)
      const from = idx >= 0 ? idx : 0
      const nextIdx = (from + delta + state.order.length) % state.order.length
      const nextId = state.order[nextIdx]
      if (nextId) {
        void setActiveSession(nextId)
      }
    }
    window.addEventListener("keydown", onKey, true)
    return () => window.removeEventListener("keydown", onKey, true)
  }, [state, setActiveSession])

  if (state === null || !upgradeBannerReady || !processUiReady) {
    return <div className="bmxt-root bmxt-root--terminal-placeholder" />
  }

  const sharedPaneProps = {
    history,
    completionCandidates,
    sessionOrder: state.order,
    activeSessionId: state.activeId,
    pickersBySession,
    setSessionPickerSlot,
    paneFocusByLeaf,
    setPaneFocusForLeaf,
    detailBarIdByLeaf,
    setDetailBarIdForLeaf,
    modeToolbarOrderByLeaf,
    setModeToolbarOrderForLeaf,
    navArmedByLeaf,
    setNavArmedForLeaf,
    onActivateSession: setActiveSession,
    refreshTabPickerRows,
    scheduleTabPickerRowsRefresh,
    postUpgradeBanner,
    appendCommandToHistory
  }

  return (
    <div ref={rootRef} className="bmxt-root bmxt-root--terminal" tabIndex={-1}>
      <div className="bmxt-session-stack">
        {state.order.map((sessionId) => (
          <SessionPaneView
            key={sessionId}
            sessionId={sessionId}
            isActive={sessionId === state.activeId}
            lines={state.logsById[sessionId] ?? []}
            {...sharedPaneProps}
          />
        ))}
      </div>
    </div>
  )
}
