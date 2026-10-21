import { useCallback, useEffect, useState } from "react"
import {
  CMD_HISTORY_KEY,
  MAX_CMD_HISTORY_LINES
} from "../extension-storage/keys"
import {
  ensureTokenCandidateMruLoaded,
  recordTokenCandidatesFromLine
} from "../command-line/token-candidate-mru"

export function useCommandHistory(): {
  history: string[]
  appendCommandToHistory: (cmd: string) => void
} {
  const [history, setHistory] = useState<string[]>([])

  useEffect(() => {
    void ensureTokenCandidateMruLoaded()
    chrome.storage.local.get([CMD_HISTORY_KEY], (r) => {
      setHistory((r[CMD_HISTORY_KEY] as string[] | undefined) ?? [])
    })
    const onChange: Parameters<typeof chrome.storage.onChanged.addListener>[0] = (
      changes,
      area
    ) => {
      if (area !== "local") {
        return
      }
      if (changes[CMD_HISTORY_KEY]) {
        setHistory((changes[CMD_HISTORY_KEY].newValue as string[] | undefined) ?? [])
      }
    }
    chrome.storage.onChanged.addListener(onChange)
    return () => chrome.storage.onChanged.removeListener(onChange)
  }, [])

  const appendCommandToHistory = useCallback((cmd: string) => {
    const trimmed = cmd.trim()
    if (!trimmed) {
      return
    }
    recordTokenCandidatesFromLine(trimmed)
    setHistory((prev) => {
      const next = [...prev, trimmed].slice(-MAX_CMD_HISTORY_LINES)
      void chrome.storage.local.set({ [CMD_HISTORY_KEY]: next })
      return next
    })
  }, [])

  return {
    history,
    appendCommandToHistory
  }
}
