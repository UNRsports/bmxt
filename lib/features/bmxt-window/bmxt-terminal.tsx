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
import { paneStripAtHorizontalEdge } from "./pane-focus-nav"
import type { SplitNode } from "./split-layout/types"
import { countLeaves, isLeaf, listLeafIds } from "./split-layout/tree"
import { appendLinesToSession } from "./terminal-sessions/state-storage"
import {
  ensureBmxtCore,
  FALLBACK_COMPLETION_CANDIDATES,
  getCompletionCandidates
} from "../bmxt-core"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { useCommandHistory } from "./use-command-history"
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
  history: string[]
  completionCandidates: string[]
  pickersBySession: SessionPickersByLeaf
  setSessionPickerSlot: <K extends PickerSlotId>(
    forSessionId: string,
    slot: K,
    value: SessionPickerState[K]
  ) => void
  refreshTabPickerRows: () => Promise<void>
  postUpgradeBanner: import("./use-version-upgrade-banner").PostUpgradeBanner | null
  appendCommandToHistory: (cmd: string) => void
  setFocusedLeaf: (sessionId: string) => void
}

function SplitTreeView({
  node,
  logsById,
  focusedLeafId,
  history,
  completionCandidates,
  pickersBySession,
  setSessionPickerSlot,
  refreshTabPickerRows,
  postUpgradeBanner,
  appendCommandToHistory,
  setFocusedLeaf
}: SplitTreeProps) {
  if (isLeaf(node)) {
    const lines = logsById[node.id] ?? []
    const sessionPickers = sessionPickersOrEmpty(pickersBySession, node.id)
    const hasColumnPickers =
      sessionPickers.tabs !== null ||
      sessionPickers.find !== null ||
      sessionPickers.dom !== null
    const leafHasKeyboardFocus = focusedLeafId === node.id
    return (
      <div
        data-bmxt-session-id={node.id}
        onMouseDown={() => {
          setFocusedLeaf(node.id)
        }}
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxSizing: "border-box",
          outline:
            leafHasKeyboardFocus && !hasColumnPickers
              ? "3px solid #58a6ff"
              : undefined,
          outlineOffset: leafHasKeyboardFocus && !hasColumnPickers ? -3 : undefined
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
        />
      </div>
    )
  }
  const isRow = node.kind === "row"
  const r = node.ratio
  const rest = 1 - r
  return (
    <div
      style={{
        display: "flex",
        flexDirection: isRow ? "column" : "row",
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        overflow: "hidden"
      }}>
      <div
        style={{
          flex: r,
          minHeight: 0,
          minWidth: 0,
          display: "flex",
          overflow: "hidden"
        }}>
        <SplitTreeView
          node={node.a}
          logsById={logsById}
          focusedLeafId={focusedLeafId}
          history={history}
          completionCandidates={completionCandidates}
          pickersBySession={pickersBySession}
          setSessionPickerSlot={setSessionPickerSlot}
          refreshTabPickerRows={refreshTabPickerRows}
          postUpgradeBanner={postUpgradeBanner}
          appendCommandToHistory={appendCommandToHistory}
          setFocusedLeaf={setFocusedLeaf}
        />
      </div>
      <div
        style={{
          flex: rest,
          minHeight: 0,
          minWidth: 0,
          display: "flex",
          overflow: "hidden"
        }}>
        <SplitTreeView
          node={node.b}
          logsById={logsById}
          focusedLeafId={focusedLeafId}
          history={history}
          completionCandidates={completionCandidates}
          pickersBySession={pickersBySession}
          setSessionPickerSlot={setSessionPickerSlot}
          refreshTabPickerRows={refreshTabPickerRows}
          postUpgradeBanner={postUpgradeBanner}
          appendCommandToHistory={appendCommandToHistory}
          setFocusedLeaf={setFocusedLeaf}
        />
      </div>
    </div>
  )
}

export function BmxtTerminal() {
  const { state, setFocusedLeaf } = useTerminalSessions()
  const { postUpgradeBanner, upgradeBannerReady } = useVersionUpgradeBanner()
  const { history, appendCommandToHistory } = useCommandHistory()
  const [completionCandidates, setCompletionCandidates] = useState<string[]>([])
  const [pickersBySession, setPickersBySession] = useState<SessionPickersByLeaf>({})
  const pickersBySessionRef = useRef(pickersBySession)
  pickersBySessionRef.current = pickersBySession

  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const order = state ? listLeafIds(state.layout.root) : null
    if (!order) {
      return
    }
    setPickersBySession((prev) => pruneSessionPickersMap(prev, order))
  }, [state?.layout.root])

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
          variant: prev.variant
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

  if (state === null || !upgradeBannerReady) {
    return (
      <div
        className="bmxt-root"
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          minHeight: 0,
          margin: 0,
          background: "#0d1117"
        }}
      />
    )
  }

  return (
    <div
      ref={rootRef}
      className="bmxt-root"
      tabIndex={-1}
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
        margin: 0,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace",
        fontSize: 12,
        background: "#0d1117",
        color: "#c9d1d9",
        outline: "none"
      }}>
      <div
        style={{
          position: "relative",
          display: "flex",
          flex: 1,
          minHeight: 0,
          isolation: "isolate",
          overflow: "hidden"
        }}>
        <SplitTreeView
          node={state.layout.root}
          logsById={state.logsById}
          focusedLeafId={state.layout.focusedLeafId}
          history={history}
          completionCandidates={completionCandidates}
          pickersBySession={pickersBySession}
          setSessionPickerSlot={setSessionPickerSlot}
          refreshTabPickerRows={refreshTabPickerRows}
          postUpgradeBanner={postUpgradeBanner}
          appendCommandToHistory={appendCommandToHistory}
          setFocusedLeaf={(id) => void setFocusedLeaf(id)}
        />
      </div>
    </div>
  )
}
