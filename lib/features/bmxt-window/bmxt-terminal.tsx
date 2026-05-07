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
import { useSessionLog } from "./use-session-log"
import { useVersionUpgradeBanner } from "./use-version-upgrade-banner"

export function BmxtTerminal() {
  const { lines, appendLogLines } = useSessionLog()
  const { postUpgradeBanner, upgradeBannerReady } = useVersionUpgradeBanner()
  const { history, appendCommandToHistory } = useCommandHistory()
  const [completionCandidates, setCompletionCandidates] = useState<string[]>([])
  const [tabPicker, setTabPicker] = useState<TabPickerState | null>(null)
  const tabPickerRef = useRef<TabPickerState | null>(null)

  useEffect(() => {
    tabPickerRef.current = tabPicker
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

  if (lines === null || !upgradeBannerReady) {
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
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <BmxtShell
          lines={lines}
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
