import { buildTabPickerRows } from "../tabs"
import { useTabPickerChromeSync } from "../tabs/use-tab-picker-chrome-sync"
import { type GrepListPickerState } from "../grep/grep-list-picker-input"
import { type DomListPickerState } from "../dom/dom-list-picker-input"
import { type TabPickerState, BmxtShell } from "./bmxt-shell"
import { adjacentLeafByRect, type RectDir } from "./split-layout/rect-nav"
import type { SplitNode } from "./split-layout/types"
import { countLeaves, isLeaf, listLeafIds } from "./split-layout/tree"
import { appendLinesToSession } from "./terminal-sessions/state-storage"
import {
  ensureBmxtCore,
  FALLBACK_COMPLETION_CANDIDATES,
  getCompletionCandidates
} from "../wasm-core"

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
  pickerBySession: Record<string, TabPickerState | null>
  setTabPickerForSession: (forSessionId: string, next: TabPickerState | null) => void
  grepListBySession: Record<string, GrepListPickerState | null>
  setGrepListPickerForSession: (forSessionId: string, next: GrepListPickerState | null) => void
  domListBySession: Record<string, DomListPickerState | null>
  setDomListPickerForSession: (forSessionId: string, next: DomListPickerState | null) => void
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
  pickerBySession,
  setTabPickerForSession,
  grepListBySession,
  setGrepListPickerForSession,
  domListBySession,
  setDomListPickerForSession,
  refreshTabPickerRows,
  postUpgradeBanner,
  appendCommandToHistory,
  setFocusedLeaf
}: SplitTreeProps) {
  if (isLeaf(node)) {
    const lines = logsById[node.id] ?? []
    const tabPicker = pickerBySession[node.id] ?? null
    const grepListPicker = grepListBySession[node.id] ?? null
    const domListPicker = domListBySession[node.id] ?? null
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
          outline: focusedLeafId === node.id ? "1px solid #58a6ff" : "1px solid transparent",
          outlineOffset: -1
        }}>
        <BmxtShell
          sessionId={node.id}
          isFocusedPane={focusedLeafId === node.id}
          lines={lines}
          history={history}
          completionCandidates={completionCandidates}
          appendLogLines={(newLines) => appendLinesToSession(node.id, newLines)}
          appendCommandToHistory={appendCommandToHistory}
          tabPicker={tabPicker}
          setTabPicker={setTabPickerForSession}
          grepListPicker={grepListPicker}
          setGrepListPicker={setGrepListPickerForSession}
          domListPicker={domListPicker}
          setDomListPicker={setDomListPickerForSession}
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
          pickerBySession={pickerBySession}
          setTabPickerForSession={setTabPickerForSession}
          grepListBySession={grepListBySession}
          setGrepListPickerForSession={setGrepListPickerForSession}
          domListBySession={domListBySession}
          setDomListPickerForSession={setDomListPickerForSession}
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
          pickerBySession={pickerBySession}
          setTabPickerForSession={setTabPickerForSession}
          grepListBySession={grepListBySession}
          setGrepListPickerForSession={setGrepListPickerForSession}
          domListBySession={domListBySession}
          setDomListPickerForSession={setDomListPickerForSession}
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
  const [pickerBySession, setPickerBySession] = useState<
    Record<string, TabPickerState | null>
  >({})
  const [grepListBySession, setGrepListBySession] = useState<
    Record<string, GrepListPickerState | null>
  >({})
  const [domListBySession, setDomListBySession] = useState<
    Record<string, DomListPickerState | null>
  >({})
  const pickerBySessionRef = useRef(pickerBySession)
  pickerBySessionRef.current = pickerBySession

  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const order = state ? listLeafIds(state.layout.root) : null
    if (!order) {
      return
    }
    setPickerBySession((prev) => {
      let changed = false
      const next: Record<string, TabPickerState | null> = { ...prev }
      for (const k of Object.keys(next)) {
        if (!order.includes(k)) {
          delete next[k]
          changed = true
        }
      }
      return changed ? next : prev
    })
    setGrepListBySession((prev) => {
      let changed = false
      const next: Record<string, GrepListPickerState | null> = { ...prev }
      for (const k of Object.keys(next)) {
        if (!order.includes(k)) {
          delete next[k]
          changed = true
        }
      }
      return changed ? next : prev
    })
    setDomListBySession((prev) => {
      let changed = false
      const next: Record<string, DomListPickerState | null> = { ...prev }
      for (const k of Object.keys(next)) {
        if (!order.includes(k)) {
          delete next[k]
          changed = true
        }
      }
      return changed ? next : prev
    })
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

  const setTabPickerForSession = useCallback((forSessionId: string, next: TabPickerState | null) => {
    setPickerBySession((prev) => {
      if (next === null) {
        if (!(forSessionId in prev)) {
          return prev
        }
        const { [forSessionId]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [forSessionId]: next }
    })
  }, [])

  const setGrepListPickerForSession = useCallback(
    (forSessionId: string, next: GrepListPickerState | null) => {
      setGrepListBySession((prev) => {
        if (next === null) {
          if (!(forSessionId in prev)) {
            return prev
          }
          const { [forSessionId]: _, ...rest } = prev
          return rest
        }
        return { ...prev, [forSessionId]: next }
      })
    },
    []
  )

  const setDomListPickerForSession = useCallback(
    (forSessionId: string, next: DomListPickerState | null) => {
      setDomListBySession((prev) => {
        if (next === null) {
          if (!(forSessionId in prev)) {
            return prev
          }
          const { [forSessionId]: _, ...rest } = prev
          return rest
        }
        return { ...prev, [forSessionId]: next }
      })
    },
    []
  )

  const refreshTabPickerRows = useCallback(async () => {
    const map = pickerBySessionRef.current
    const sids = Object.keys(map).filter((k) => map[k] != null)
    if (sids.length === 0) {
      return
    }
    const updates: Record<string, TabPickerState> = {}
    for (const sid of sids) {
      const prev = map[sid]
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
    setPickerBySession((p) => {
      const next = { ...p }
      for (const [sid, st] of Object.entries(updates)) {
        if (next[sid]) {
          next[sid] = st
        }
      }
      return next
    })
  }, [])

  const anyPickerOpen = useMemo(
    () =>
      Object.values(pickerBySession).some((v) => v != null) ||
      Object.values(grepListBySession).some((v) => v != null) ||
      Object.values(domListBySession).some((v) => v != null),
    [pickerBySession, grepListBySession, domListBySession]
  )
  useTabPickerChromeSync(refreshTabPickerRows, anyPickerOpen)

  useEffect(() => {
    if (!state || countLeaves(state.layout.root) <= 1) {
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
      const next = adjacentLeafByRect(state.layout.root, fromId, dir)
      if (next) {
        e.preventDefault()
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
          pickerBySession={pickerBySession}
          setTabPickerForSession={setTabPickerForSession}
          grepListBySession={grepListBySession}
          setGrepListPickerForSession={setGrepListPickerForSession}
          domListBySession={domListBySession}
          setDomListPickerForSession={setDomListPickerForSession}
          refreshTabPickerRows={refreshTabPickerRows}
          postUpgradeBanner={postUpgradeBanner}
          appendCommandToHistory={appendCommandToHistory}
          setFocusedLeaf={(id) => void setFocusedLeaf(id)}
        />
      </div>
    </div>
  )
}
