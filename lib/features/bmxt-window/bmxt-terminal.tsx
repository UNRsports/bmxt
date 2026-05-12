import { buildTabPickerRows } from "../tabs"
import { useTabPickerChromeSync } from "../tabs/use-tab-picker-chrome-sync"
import { type TabPickerState, BmxtShell } from "./bmxt-shell"
import {
  ensureBmxtCore,
  FALLBACK_COMPLETION_CANDIDATES,
  getCompletionCandidates
} from "../wasm-core"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

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
  /** セッションごとに tabs / group-new ピッカーを保持（切替でも明示終了まで維持）。 */
  const [pickerBySession, setPickerBySession] = useState<
    Record<string, TabPickerState | null>
  >({})
  const pickerBySessionRef = useRef(pickerBySession)
  pickerBySessionRef.current = pickerBySession

  const tabPicker =
    activeSessionId !== null ? (pickerBySession[activeSessionId] ?? null) : null
  const tabPickerRef = useRef<TabPickerState | null>(null)

  useEffect(() => {
    tabPickerRef.current = tabPicker
  }, [tabPicker])

  /** 削除されたセッションのピッカー状態を掃除。 */
  useEffect(() => {
    const order = state?.order
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
  }, [state?.order])

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
    () => Object.values(pickerBySession).some((v) => v != null),
    [pickerBySession]
  )
  useTabPickerChromeSync(refreshTabPickerRows, anyPickerOpen)

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
          setTabPicker={setTabPickerForSession}
          tabPickerRef={tabPickerRef}
          refreshTabPickerRows={refreshTabPickerRows}
          postUpgradeBanner={postUpgradeBanner}
        />
      </div>
    </div>
  )
}
