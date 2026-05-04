import { useCallback, useEffect, useState } from "react"
import { SPLIT_SESSION_KEY } from "../extension-storage/keys"
import { allPaneIds } from "./layout-ops"
import {
  appendLinesToPane,
  loadOrMigrateSplitSession,
  normalizeSession,
  setFocusedPane as persistFocusedPane
} from "./storage"
import type { SplitSessionV1 } from "./types"

export function useSplitSession(): {
  session: SplitSessionV1 | null
  appendLogForPane: (paneId: string, lines: string[]) => Promise<void>
  setFocusedPane: (paneId: string) => void
} {
  const [session, setSession] = useState<SplitSessionV1 | null>(null)

  useEffect(() => {
    void loadOrMigrateSplitSession().then(setSession)
    const onChange: Parameters<typeof chrome.storage.onChanged.addListener>[0] = (
      changes,
      area
    ) => {
      if (area !== "local") {
        return
      }
      const ch = changes[SPLIT_SESSION_KEY]
      if (ch?.newValue) {
        setSession(normalizeSession(ch.newValue as SplitSessionV1))
      }
    }
    chrome.storage.onChanged.addListener(onChange)
    return () => chrome.storage.onChanged.removeListener(onChange)
  }, [])

  const appendLogForPane = useCallback(async (paneId: string, lines: string[]) => {
    await appendLinesToPane(paneId, lines)
  }, [])

  const setFocusedPane = useCallback((paneId: string) => {
    setSession((s) => {
      if (!s || !allPaneIds(s.root).includes(paneId)) {
        return s
      }
      return { ...s, focusedPaneId: paneId }
    })
    void persistFocusedPane(paneId)
  }, [])

  return {
    session,
    appendLogForPane,
    setFocusedPane
  }
}
