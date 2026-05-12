import { buildTabPickerRows } from "../tabs"
import { useTabPickerChromeSync } from "../tabs/use-tab-picker-chrome-sync"
import { type TabPickerState, BmxtShell } from "./bmxt-shell"
import {
  ensureBmxtCore,
  FALLBACK_COMPLETION_CANDIDATES,
  getCompletionCandidates
} from "../wasm-core"

import { useCallback, useEffect, useRef, useState } from "react"

import { useCommandHistory } from "./use-command-history"
import { SessionTabStrip } from "./terminal-sessions/session-tab-strip"
import { useTerminalSessions } from "./terminal-sessions/use-terminal-sessions"
import { useVersionUpgradeBanner } from "./use-version-upgrade-banner"

export function BmxtTerminal() {
  const {
    state,
    activeSessionId,
    activeLines,
    appendLogLines,
    selectSession,
    addSession,
    closeSession
  } = useTerminalSessions()
  const { postUpgradeBanner, upgradeBannerReady } = useVersionUpgradeBanner()
  const { history, appendCommandToHistory } = useCommandHistory()
  const [completionCandidates, setCompletionCandidates] = useState<string[]>([])
  const [tabPicker, setTabPicker] = useState<TabPickerState | null>(null)
  const tabPickerRef = useRef<TabPickerState | null>(null)
  const prevActiveSessionIdRef = useRef<string | null>(null)

  useEffect(() => {
    tabPickerRef.current = tabPicker
  }, [tabPicker])

  /** ターミナルセッション切替時は tabs モードを閉じ、このセッション内の UI に閉じる。 */
  useEffect(() => {
    const prev = prevActiveSessionIdRef.current
    if (prev !== null && prev !== activeSessionId) {
      setTabPicker(null)
    }
    prevActiveSessionIdRef.current = activeSessionId
  }, [activeSessionId])

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

  if (
    activeLines === null ||
    activeSessionId === null ||
    state === null ||
    !upgradeBannerReady
  ) {
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
      <SessionTabStrip
        order={state.order}
        activeId={state.activeId}
        onSelect={(id) => void selectSession(id)}
        onAdd={() => void addSession()}
        onClose={(id) => void closeSession(id)}
      />
      <div
        style={{
          position: "relative",
          display: "flex",
          flex: 1,
          minHeight: 0,
          isolation: "isolate",
          overflow: "hidden"
        }}>
        <BmxtShell
          key={activeSessionId}
          sessionId={activeSessionId}
          lines={activeLines}
          history={history}
          completionCandidates={completionCandidates}
          appendLogLines={appendLogLines}
          appendCommandToHistory={appendCommandToHistory}
          tabPicker={tabPicker}
          setTabPicker={setTabPicker}
          tabPickerRef={tabPickerRef}
          refreshTabPickerRows={refreshTabPickerRows}
          postUpgradeBanner={postUpgradeBanner}
        />
      </div>
    </div>
  )
}
