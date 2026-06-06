import { buildTabPickerRows } from "../tabs"
import { useTabPickerChromeSync } from "../tabs/use-tab-picker-chrome-sync"
import {
  anyLeafHasPickerOpen,
  pruneSessionPickersMap,
  sessionPickersOrEmpty,
  setSessionPickerSlot as applySessionPickerSlot,
  type PickerSlotId,
  type SessionPickerState,
  type SessionPickersByLeaf,
  type TabPickerState
} from "../side-picker"
import { BmxtShell } from "./bmxt-shell"
import { adjacentLeafByRect, type RectDir } from "./split-layout/rect-nav"
import { paneStripAtHorizontalEdge } from "../side-picker/panel/pane-focus-nav"
import type { PaneFocusTarget } from "../side-picker/panel/pane-focus-nav"
import type { SplitNode } from "./split-layout/types"
import { countLeaves, isLeaf, listLeafIds } from "./split-layout/tree"
import { appendLinesToSession } from "./terminal-sessions/state-storage"
import {
  ensureBmxtCore,
  FALLBACK_COMPLETION_CANDIDATES,
  getCompletionCandidates
} from "../bmxt-core"
import { CSP_DYNAMIC_SCOPE_ATTR, useCspDynamicStyle } from "./csp-dynamic-stylesheet"

import { useCallback, useEffect, useMemo, useRef, useState, useId } from "react"

import { useCommandHistory } from "./use-command-history"
import { useProcessUiPersistence } from "./use-process-ui-persistence"
import { useTerminalSessions } from "./terminal-sessions/use-terminal-sessions"
import { useVersionUpgradeBanner } from "./use-version-upgrade-banner"

function leafIdFromKeyEventTarget(root: HTMLElement, target: EventTarget | null): string | null {
  let el: Element | null =
    target instanceof Element ? target : target instanceof Text ? target.parentElement : null
  while (el && el !== root) {
    const sid = el.getAttribute("data-bmxt-session-id")
    if (typeof sid === "string" && sid.length > 0) {
      return sid
    }
    el = el.parentElement
  }
  return null
}

type SplitTreeProps = {
  node: SplitNode
  logsById: Record<string, string[]>
  focusedLeafId: string
  onFocusLeaf: (sessionId: string) => void
  history: string[]
  completionCandidates: string[]
  pickersBySession: SessionPickersByLeaf
  setSessionPickerSlot: <K extends PickerSlotId>(
    forSessionId: string,
    slot: K,
    value: SessionPickerState[K]
  ) => void
  paneFocusByLeaf: Record<string, PaneFocusTarget>
  setPaneFocusForLeaf: (sessionId: string, target: PaneFocusTarget) => void
  refreshTabPickerRows: () => Promise<void>
  postUpgradeBanner: import("./use-version-upgrade-banner").PostUpgradeBanner | null
  appendCommandToHistory: (cmd: string) => void
}

function SplitLeafView({
  node,
  logsById,
  focusedLeafId,
  onFocusLeaf,
  history,
  completionCandidates,
  pickersBySession,
  setSessionPickerSlot,
  paneFocusByLeaf,
  setPaneFocusForLeaf,
  refreshTabPickerRows,
  postUpgradeBanner,
  appendCommandToHistory
}: SplitTreeProps & { node: Extract<SplitNode, { kind: "leaf" }> }) {
  const lines = logsById[node.id] ?? []
  const sessionPickers = sessionPickersOrEmpty(pickersBySession, node.id)
  const hasColumnPickers =
    sessionPickers.tabs !== null ||
    sessionPickers.search !== null ||
    sessionPickers.dom !== null
  const leafHasKeyboardFocus = focusedLeafId === node.id
  return (
    <div
      data-bmxt-session-id={node.id}
      data-bmxt-leaf-focused={leafHasKeyboardFocus ? "" : undefined}
      className={`bmxt-split-leaf${
        leafHasKeyboardFocus && !hasColumnPickers ? " bmxt-split-leaf--focused" : ""
      }`}
      onPointerDownCapture={() => {
        if (!leafHasKeyboardFocus) {
          onFocusLeaf(node.id)
        }
      }}>
      <BmxtShell
        sessionId={node.id}
        isFocusedPane={focusedLeafId === node.id}
        lines={lines}
        history={history}
        completionCandidates={completionCandidates}
        appendLogLines={(newLines) => appendLinesToSession(node.id, newLines)}
        appendCommandToHistory={appendCommandToHistory}
        sessionPickers={sessionPickers}
        setSessionPickerSlot={setSessionPickerSlot}
        refreshTabPickerRows={refreshTabPickerRows}
        postUpgradeBanner={postUpgradeBanner}
        paneFocus={paneFocusByLeaf[node.id] ?? "terminal"}
        onPaneFocusChange={(target) => setPaneFocusForLeaf(node.id, target)}
      />
    </div>
  )
}

function SplitBranchView({
  node,
  logsById,
  focusedLeafId,
  onFocusLeaf,
  history,
  completionCandidates,
  pickersBySession,
  setSessionPickerSlot,
  paneFocusByLeaf,
  setPaneFocusForLeaf,
  refreshTabPickerRows,
  postUpgradeBanner,
  appendCommandToHistory
}: SplitTreeProps & { node: Extract<SplitNode, { kind: "row" | "col" }> }) {
  const isRow = node.kind === "row"
  const r = node.ratio
  const rest = 1 - r
  const paneAScopeId = useId()
  const paneBScopeId = useId()
  useCspDynamicStyle(paneAScopeId, { flex: r })
  useCspDynamicStyle(paneBScopeId, { flex: rest })
  return (
    <div
      className={`bmxt-split-branch ${isRow ? "bmxt-split-branch--row" : "bmxt-split-branch--col"}`}>
      <div className="bmxt-split-pane" {...{ [CSP_DYNAMIC_SCOPE_ATTR]: paneAScopeId }}>
        <SplitTreeView
          node={node.a}
          logsById={logsById}
          focusedLeafId={focusedLeafId}
          onFocusLeaf={onFocusLeaf}
          history={history}
          completionCandidates={completionCandidates}
          pickersBySession={pickersBySession}
          setSessionPickerSlot={setSessionPickerSlot}
          paneFocusByLeaf={paneFocusByLeaf}
          setPaneFocusForLeaf={setPaneFocusForLeaf}
          refreshTabPickerRows={refreshTabPickerRows}
          postUpgradeBanner={postUpgradeBanner}
          appendCommandToHistory={appendCommandToHistory}
        />
      </div>
      <div className="bmxt-split-pane" {...{ [CSP_DYNAMIC_SCOPE_ATTR]: paneBScopeId }}>
        <SplitTreeView
          node={node.b}
          logsById={logsById}
          focusedLeafId={focusedLeafId}
          onFocusLeaf={onFocusLeaf}
          history={history}
          completionCandidates={completionCandidates}
          pickersBySession={pickersBySession}
          setSessionPickerSlot={setSessionPickerSlot}
          paneFocusByLeaf={paneFocusByLeaf}
          setPaneFocusForLeaf={setPaneFocusForLeaf}
          refreshTabPickerRows={refreshTabPickerRows}
          postUpgradeBanner={postUpgradeBanner}
          appendCommandToHistory={appendCommandToHistory}
        />
      </div>
    </div>
  )
}

function SplitTreeView(props: SplitTreeProps) {
  const { node } = props
  if (isLeaf(node)) {
    return <SplitLeafView {...props} node={node} />
  }
  return <SplitBranchView {...props} node={node} />
}

export function BmxtTerminal() {
  const { state, setFocusedLeaf } = useTerminalSessions()
  const { postUpgradeBanner, upgradeBannerReady } = useVersionUpgradeBanner()
  const { history, appendCommandToHistory } = useCommandHistory()
  const [completionCandidates, setCompletionCandidates] = useState<string[]>([])

  const validLeafIds = useMemo(
    () => (state ? listLeafIds(state.layout.root) : []),
    [state?.layout.root]
  )

  const {
    pickersBySession,
    setPickersBySession,
    paneFocusByLeaf,
    setPaneFocusForLeaf,
    processUiReady
  } = useProcessUiPersistence(validLeafIds, state !== null)

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

  const setSessionPickerSlot = useCallback(
    <K extends PickerSlotId>(forSessionId: string, slot: K, value: SessionPickerState[K]) => {
      setPickersBySession((prev) => applySessionPickerSlot(prev, forSessionId, slot, value))
    },
    []
  )

  const refreshTabPickerRows = useCallback(async () => {
    const map = pickersBySessionRef.current
    const updates: Record<string, TabPickerState> = {}
    for (const [sid, pickers] of Object.entries(map)) {
      const prev = pickers.tabs
      if (!prev) {
        continue
      }
      try {
        const rows = await buildTabPickerRows(prev.showUrl)
        updates[sid] = {
          rows,
          showUrl: prev.showUrl,
          initialHi: prev.initialHi,
          variant: prev.variant,
          interactive: prev.interactive
        }
      } catch {
        /* keep previous */
      }
    }
    if (Object.keys(updates).length === 0) {
      return
    }
    setPickersBySession((p) => {
      let next = p
      for (const [sid, st] of Object.entries(updates)) {
        const cur = sessionPickersOrEmpty(next, sid)
        if (cur.tabs) {
          next = applySessionPickerSlot(next, sid, "tabs", st)
        }
      }
      return next
    })
  }, [])

  const anyPickerOpen = useMemo(
    () => anyLeafHasPickerOpen(pickersBySession),
    [pickersBySession]
  )
  useTabPickerChromeSync(refreshTabPickerRows, anyPickerOpen)

  useEffect(() => {
    if (!state) {
      return
    }
    const onKey = (e: KeyboardEvent) => {
      if (!e.ctrlKey || e.metaKey || e.altKey) {
        return
      }
      const keyMap: Record<string, RectDir> = {
        ArrowLeft: "left",
        ArrowRight: "right",
        ArrowUp: "up",
        ArrowDown: "down"
      }
      const dir = keyMap[e.key]
      if (!dir) {
        return
      }
      const t = e.target as Node | null
      if (!t || !rootRef.current?.contains(t)) {
        return
      }
      const fromId =
        (rootRef.current && leafIdFromKeyEventTarget(rootRef.current, e.target)) ??
        state.layout.focusedLeafId
      const horiz = dir === "left" || dir === "right" ? dir : null
      if (horiz && !paneStripAtHorizontalEdge(fromId, horiz)) {
        return
      }
      if (countLeaves(state.layout.root) <= 1) {
        return
      }
      const next = adjacentLeafByRect(state.layout.root, fromId, dir)
      if (next) {
        e.preventDefault()
        e.stopPropagation()
        void setFocusedLeaf(next)
      }
    }
    window.addEventListener("keydown", onKey, true)
    return () => window.removeEventListener("keydown", onKey, true)
  }, [state, setFocusedLeaf])

  if (state === null || !upgradeBannerReady || !processUiReady) {
    return <div className="bmxt-root bmxt-root--terminal-placeholder" />
  }

  return (
    <div ref={rootRef} className="bmxt-root bmxt-root--terminal" tabIndex={-1}>
      <div className="bmxt-split-viewport">
        <SplitTreeView
          node={state.layout.root}
          logsById={state.logsById}
          focusedLeafId={state.layout.focusedLeafId}
          onFocusLeaf={(sessionId) => void setFocusedLeaf(sessionId)}
          history={history}
          completionCandidates={completionCandidates}
          pickersBySession={pickersBySession}
          setSessionPickerSlot={setSessionPickerSlot}
          paneFocusByLeaf={paneFocusByLeaf}
          setPaneFocusForLeaf={setPaneFocusForLeaf}
          refreshTabPickerRows={refreshTabPickerRows}
          postUpgradeBanner={postUpgradeBanner}
          appendCommandToHistory={appendCommandToHistory}
        />
      </div>
    </div>
  )
}
