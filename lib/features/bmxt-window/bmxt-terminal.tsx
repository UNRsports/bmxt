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
} from "../side-picker/session/session-pickers"
import { buildSessionListRows, SessionBar, type SessionListRow } from "../session"
import { BmxtShell } from "./bmxt-shell"
import { TerminalBootSplash } from "./terminal-boot-splash"
import type { PaneFocusTarget } from "../side-picker/panel/pane-focus-nav"
import type { DetailBarId } from "./detail-bar-focus"
import type { ModeToolbarId } from "./mode-toolbar-order"
import { appendSessionLogFromUiAsync } from "./terminal-sessions/session-runtime-client"
import {
  ensureBmxtCore,
  FALLBACK_COMPLETION_CANDIDATES,
  getCompletionCandidates
} from "../bmxt-core"
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { disposeJobRunner } from "../job"
import {
  flushPageBootPerf,
  markPageBootPhase
} from "../launch/page-boot-perf"
import { useCommandHistory } from "./use-command-history"
import { useProcessUiPersistence } from "./use-process-ui-persistence"
import { useTerminalSessions } from "./terminal-sessions/use-terminal-sessions"
import { useVersionUpgradeBanner } from "./use-version-upgrade-banner"
import { UiSettingsProvider, useUiSettings } from "../setting/use-ui-settings"
import { useTerminalAppearance } from "../setting/apply-appearance"

const EMPTY_SESSION_LIST_ROWS: SessionListRow[] = []

type SessionPaneProps = {
  sessionId: string
  isActive: boolean
  lines: string[]
  history: string[]
  completionCandidates: string[]
  sessionOrder: string[]
  activeSessionId: string
  sessionNamesById: Record<string, string | undefined>
  sessionLogsById: Record<string, string[] | undefined>
  sessionListRows: SessionListRow[]
  sessionPickers: SessionPickerState
  setSessionPickerSlot: <K extends PickerSlotId>(
    forSessionId: string,
    slot: K,
    value: SessionPickerState[K] | ((prev: SessionPickerState[K]) => SessionPickerState[K])
  ) => void
  paneFocus: PaneFocusTarget
  setPaneFocusForLeaf: (sessionId: string, target: PaneFocusTarget) => void
  detailBarId: DetailBarId | null
  setDetailBarIdForLeaf: (
    sessionId: string,
    update: import("react").SetStateAction<DetailBarId | null>
  ) => void
  modeToolbarOrder: ModeToolbarId[]
  setModeToolbarOrderForLeaf: (
    sessionId: string,
    update: import("react").SetStateAction<ModeToolbarId[]>
  ) => void
  navArmed: boolean
  setNavArmedForLeaf: (sessionId: string, armed: boolean) => void
  navArmedByLeaf: Record<string, boolean>
  onActivateSession: (sessionId: string) => Promise<void>
  onSetSessionDisplayName: (sessionId: string, name: string) => Promise<void>
  refreshTabPickerRows: () => Promise<void>
  scheduleTabPickerRowsRefresh: () => void
  postUpgradeBanner: import("./use-version-upgrade-banner").PostUpgradeBanner | null
  upgradeBannerReady: boolean
  appendCommandToHistory: (cmd: string) => void
}

const SessionPaneView = memo(function SessionPaneView({
  sessionId,
  isActive,
  lines,
  history,
  completionCandidates,
  sessionOrder,
  activeSessionId,
  sessionNamesById,
  sessionLogsById,
  sessionListRows,
  sessionPickers,
  setSessionPickerSlot,
  paneFocus,
  setPaneFocusForLeaf,
  detailBarId,
  setDetailBarIdForLeaf,
  modeToolbarOrder,
  setModeToolbarOrderForLeaf,
  navArmed,
  setNavArmedForLeaf,
  navArmedByLeaf,
  onActivateSession,
  onSetSessionDisplayName,
  refreshTabPickerRows,
  scheduleTabPickerRowsRefresh,
  postUpgradeBanner,
  upgradeBannerReady,
  appendCommandToHistory
}: SessionPaneProps) {
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
        sessionNamesById={sessionNamesById}
        sessionLogsById={sessionLogsById}
        sessionListRows={sessionListRows}
        navArmedByLeaf={navArmedByLeaf}
        onActivateSession={onActivateSession}
        onSetSessionDisplayName={onSetSessionDisplayName}
        appendLogLines={(newLines) => appendSessionLogFromUiAsync(sessionId, newLines)}
        appendCommandToHistory={appendCommandToHistory}
        sessionPickers={sessionPickers}
        setSessionPickerSlot={setSessionPickerSlot}
        refreshTabPickerRows={refreshTabPickerRows}
        scheduleTabPickerRowsRefresh={scheduleTabPickerRowsRefresh}
        postUpgradeBanner={postUpgradeBanner}
        upgradeBannerReady={upgradeBannerReady}
        paneFocus={paneFocus}
        onPaneFocusChange={(target) => setPaneFocusForLeaf(sessionId, target)}
        detailBarId={detailBarId}
        onDetailBarIdChange={(update) => setDetailBarIdForLeaf(sessionId, update)}
        modeToolbarOrder={modeToolbarOrder}
        onModeToolbarOrderChange={(update) => setModeToolbarOrderForLeaf(sessionId, update)}
        navArmed={navArmed}
        onNavArmedChange={(armed) => setNavArmedForLeaf(sessionId, armed)}
      />
    </div>
  )
}, sessionPanePropsEqual)

function sessionPanePropsEqual(prev: SessionPaneProps, next: SessionPaneProps): boolean {
  if (prev.sessionId !== next.sessionId || prev.isActive !== next.isActive) {
    return false
  }
  if (
    prev.sessionPickers === next.sessionPickers &&
    prev.paneFocus === next.paneFocus &&
    prev.detailBarId === next.detailBarId &&
    prev.modeToolbarOrder === next.modeToolbarOrder &&
    prev.navArmed === next.navArmed &&
    prev.lines === next.lines &&
    prev.setSessionPickerSlot === next.setSessionPickerSlot &&
    prev.setPaneFocusForLeaf === next.setPaneFocusForLeaf &&
    prev.setDetailBarIdForLeaf === next.setDetailBarIdForLeaf &&
    prev.setModeToolbarOrderForLeaf === next.setModeToolbarOrderForLeaf &&
    prev.setNavArmedForLeaf === next.setNavArmedForLeaf &&
    prev.onActivateSession === next.onActivateSession &&
    prev.onSetSessionDisplayName === next.onSetSessionDisplayName &&
    prev.refreshTabPickerRows === next.refreshTabPickerRows &&
    prev.scheduleTabPickerRowsRefresh === next.scheduleTabPickerRowsRefresh &&
    prev.appendCommandToHistory === next.appendCommandToHistory
  ) {
    return !next.isActive
  }
  return (
    prev.lines === next.lines &&
    prev.history === next.history &&
    prev.completionCandidates === next.completionCandidates &&
    prev.sessionOrder === next.sessionOrder &&
    prev.activeSessionId === next.activeSessionId &&
    prev.sessionNamesById === next.sessionNamesById &&
    prev.sessionLogsById === next.sessionLogsById &&
    prev.sessionListRows === next.sessionListRows &&
    prev.sessionPickers === next.sessionPickers &&
    prev.paneFocus === next.paneFocus &&
    prev.detailBarId === next.detailBarId &&
    prev.modeToolbarOrder === next.modeToolbarOrder &&
    prev.navArmed === next.navArmed &&
    prev.navArmedByLeaf === next.navArmedByLeaf &&
    prev.postUpgradeBanner === next.postUpgradeBanner &&
    prev.upgradeBannerReady === next.upgradeBannerReady &&
    prev.setSessionPickerSlot === next.setSessionPickerSlot &&
    prev.setPaneFocusForLeaf === next.setPaneFocusForLeaf &&
    prev.setDetailBarIdForLeaf === next.setDetailBarIdForLeaf &&
    prev.setModeToolbarOrderForLeaf === next.setModeToolbarOrderForLeaf &&
    prev.setNavArmedForLeaf === next.setNavArmedForLeaf &&
    prev.onActivateSession === next.onActivateSession &&
    prev.onSetSessionDisplayName === next.onSetSessionDisplayName &&
    prev.refreshTabPickerRows === next.refreshTabPickerRows &&
    prev.scheduleTabPickerRowsRefresh === next.scheduleTabPickerRowsRefresh &&
    prev.appendCommandToHistory === next.appendCommandToHistory
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

  const { state, setActiveSession, setSessionDisplayName } = useTerminalSessions()
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

  const sessionListRows = useMemo(
    () =>
      state
        ? buildSessionListRows({
            order: state.order,
            activeId: state.activeId,
            namesById: state.namesById,
            logsById: state.logsById,
            pickersBySession,
            navArmedByLeaf,
            locale: settings.locale
          })
        : [],
    [navArmedByLeaf, pickersBySession, settings.locale, state]
  )

  const pickersBySessionRef = useRef(pickersBySession)
  pickersBySessionRef.current = pickersBySession

  const rootRef = useRef<HTMLDivElement | null>(null)
  const promptPerfFlushedRef = useRef(false)

  useEffect(() => {
    markPageBootPhase("terminal-mounted")
  }, [])

  useEffect(() => {
    if (upgradeBannerReady) {
      markPageBootPhase("gate-upgrade-banner-ready")
    }
  }, [upgradeBannerReady])

  useEffect(() => {
    if (processUiReady) {
      markPageBootPhase("gate-process-ui-ready")
    }
  }, [processUiReady])

  useEffect(() => {
    if (state !== null) {
      markPageBootPhase("gate-session-state-ready")
    }
  }, [state])

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

  const prevSessionOrderRef = useRef<readonly string[]>([])
  const [mountedSessionIds, setMountedSessionIds] = useState<ReadonlySet<string>>(() => new Set())

  useEffect(() => {
    if (!state) {
      return
    }
    setMountedSessionIds((prev) => {
      if (prev.has(state.activeId)) {
        return prev
      }
      const next = new Set(prev)
      next.add(state.activeId)
      return next
    })
  }, [state?.activeId])

  useEffect(() => {
    if (!state) {
      return
    }
    const prev = prevSessionOrderRef.current
    for (const sessionId of prev) {
      if (!state.order.includes(sessionId)) {
        disposeJobRunner(sessionId)
        setMountedSessionIds((mounted) => {
          if (!mounted.has(sessionId)) {
            return mounted
          }
          const next = new Set(mounted)
          next.delete(sessionId)
          return next
        })
      }
    }
    prevSessionOrderRef.current = state.order
  }, [state?.order])

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

  const promptInteractive = state !== null && processUiReady

  useEffect(() => {
    if (!promptInteractive || promptPerfFlushedRef.current) {
      return
    }
    promptPerfFlushedRef.current = true
    markPageBootPhase("prompt-interactive")
    void flushPageBootPerf()
  }, [promptInteractive])

  if (!promptInteractive) {
    return <TerminalBootSplash />
  }

  const sharedPaneProps = {
    history,
    completionCandidates,
    sessionOrder: state.order,
    activeSessionId: state.activeId,
    sessionNamesById: state.namesById,
    sessionLogsById: state.logsById,
    sessionListRows,
    setSessionPickerSlot,
    setPaneFocusForLeaf,
    setDetailBarIdForLeaf,
    setModeToolbarOrderForLeaf,
    setNavArmedForLeaf,
    navArmedByLeaf,
    onActivateSession: setActiveSession,
    onSetSessionDisplayName: setSessionDisplayName,
    refreshTabPickerRows,
    scheduleTabPickerRowsRefresh,
    postUpgradeBanner,
    upgradeBannerReady,
    appendCommandToHistory
  }

  return (
    <div ref={rootRef} className="bmxt-root bmxt-root--terminal" tabIndex={-1}>
      <SessionBar
        order={state.order}
        activeId={state.activeId}
        namesById={state.namesById}
        logsById={state.logsById}
        pickersBySession={pickersBySession}
        navArmedByLeaf={navArmedByLeaf}
        onActivateSession={(id) => {
          void setActiveSession(id)
        }}
      />
      <div className="bmxt-session-stack">
        {state.order.map((sessionId) => {
          const isActive = sessionId === state.activeId
          if (!mountedSessionIds.has(sessionId) && !isActive) {
            return null
          }
          return (
            <SessionPaneView
              key={sessionId}
              sessionId={sessionId}
              isActive={isActive}
              lines={state.logsById[sessionId] ?? []}
              sessionPickers={sessionPickersOrEmpty(pickersBySession, sessionId)}
              paneFocus={paneFocusByLeaf[sessionId] ?? "terminal"}
              detailBarId={detailBarIdByLeaf[sessionId] ?? null}
              modeToolbarOrder={modeToolbarOrderByLeaf[sessionId] ?? []}
              navArmed={navArmedByLeaf[sessionId] ?? false}
              sessionListRows={isActive ? sessionListRows : EMPTY_SESSION_LIST_ROWS}
              {...sharedPaneProps}
            />
          )
        })}
      </div>
    </div>
  )
}
