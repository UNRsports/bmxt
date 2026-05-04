import { buildTabPickerRows } from "../tabs"
import { useTabPickerChromeSync } from "../tabs/use-tab-picker-chrome-sync"
import {
  neighborPane,
  SplitLayout,
  type TabPickerState,
  useSplitSession,
  type BmxtPaneShellSharedProps
} from "../split"
import {
  ensureBmxtCore,
  FALLBACK_COMPLETION_CANDIDATES,
  getCompletionCandidates
} from "../wasm-core"

import { useCallback, useEffect, useRef, useState } from "react"

import { useCommandHistory } from "./use-command-history"

export function BmxtTerminal() {
  const { session, appendLogForPane, setFocusedPane } = useSplitSession()
  const { history, appendCommandToHistory } = useCommandHistory()
  const [completionCandidates, setCompletionCandidates] = useState<string[]>(
    []
  )
  const [tabPicker, setTabPicker] = useState<TabPickerState | null>(null)
  const [tabPickerHostPaneId, setTabPickerHostPaneId] = useState<string | null>(
    null
  )
  const tabPickerRef = useRef<TabPickerState | null>(null)
  useEffect(() => {
    tabPickerRef.current = tabPicker
  }, [tabPicker])

  useEffect(() => {
    if (!tabPicker) {
      setTabPickerHostPaneId(null)
    }
  }, [tabPicker])

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

  const refreshTabPickerRows = useCallback(async () => {
    const prev = tabPickerRef.current
    if (!prev) {
      return
    }
    try {
      const rows = await buildTabPickerRows(prev.showUrl)
      setTabPicker({
        rows,
        showUrl: prev.showUrl,
        initialHi: prev.initialHi,
        variant: prev.variant
      })
    } catch {
      /* keep previous rows */
    }
  }, [])

  useTabPickerChromeSync(refreshTabPickerRows, tabPicker !== null)

  const sessionRef = useRef(session)
  useEffect(() => {
    sessionRef.current = session
  }, [session])

  /** プロンプト／tabs ピッカー表示中どちらでも Alt+矢印でペイン移動（キャプチャで先に処理） */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) {
        return
      }
      const map = {
        ArrowUp: "up",
        ArrowDown: "down",
        ArrowLeft: "left",
        ArrowRight: "right"
      } as const
      const dir = map[e.key as keyof typeof map]
      if (dir === undefined) {
        return
      }
      const s = sessionRef.current
      if (!s) {
        return
      }
      const next = neighborPane(s.root, s.focusedPaneId, dir)
      if (next === null) {
        return
      }
      e.preventDefault()
      e.stopImmediatePropagation()
      setFocusedPane(next)
      if (tabPickerRef.current) {
        setTabPicker(null)
      }
    }
    window.addEventListener("keydown", onKey, true)
    return () => window.removeEventListener("keydown", onKey, true)
  }, [setFocusedPane, setTabPicker])

  if (!session) {
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

  const shell: BmxtPaneShellSharedProps = {
    history,
    completionCandidates,
    appendLogForPane,
    appendCommandToHistory,
    tabPicker,
    tabPickerHostPaneId,
    setTabPicker,
    tabPickerRef,
    refreshTabPickerRows,
    setTabPickerSourcePane: (paneId) => {
      setTabPickerHostPaneId(paneId)
    }
  }

  return (
    <div
      className="bmxt-root"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
        margin: 0,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace",
        fontSize: 12,
        background: "#0d1117",
        color: "#c9d1d9"
      }}>
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <SplitLayout
          node={session.root}
          paneLogs={session.paneLogs}
          focusedPaneId={session.focusedPaneId}
          setFocusedPane={setFocusedPane}
          shell={shell}
        />
      </div>
    </div>
  )
}
