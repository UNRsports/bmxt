import { useCallback, useEffect, useState } from "react"
import {
  CMD_HISTORY_KEY,
  MAX_CMD_HISTORY_LINES,
  MAX_SESSION_LOG_LINES,
  SESSION_LOG_KEY
} from "../extension-storage/keys"

export function useSessionLogAndHistory(): {
  lines: string[]
  history: string[]
  appendLogLines: (newLines: string[]) => Promise<void>
  appendCommandToHistory: (cmd: string) => void
} {
  const [lines, setLines] = useState<string[]>([])
  const [history, setHistory] = useState<string[]>([])

  useEffect(() => {
    chrome.storage.local.get([SESSION_LOG_KEY, CMD_HISTORY_KEY], (r) => {
      setLines((r[SESSION_LOG_KEY] as string[] | undefined) ?? [])
      setHistory((r[CMD_HISTORY_KEY] as string[] | undefined) ?? [])
    })
    const onChange: Parameters<typeof chrome.storage.onChanged.addListener>[0] = (
      changes,
      area
    ) => {
      if (area !== "local") {
        return
      }
      if (changes[SESSION_LOG_KEY]) {
        setLines((changes[SESSION_LOG_KEY].newValue as string[] | undefined) ?? [])
      }
      if (changes[CMD_HISTORY_KEY]) {
        setHistory((changes[CMD_HISTORY_KEY].newValue as string[] | undefined) ?? [])
      }
    }
    chrome.storage.onChanged.addListener(onChange)
    return () => chrome.storage.onChanged.removeListener(onChange)
  }, [])

  const appendLogLines = useCallback(async (newLines: string[]) => {
    const prev = await chrome.storage.local.get(SESSION_LOG_KEY)
    const arr = [...((prev[SESSION_LOG_KEY] as string[] | undefined) ?? []), ...newLines].slice(
      -MAX_SESSION_LOG_LINES
    )
    await chrome.storage.local.set({ [SESSION_LOG_KEY]: arr })
  }, [])

  const appendCommandToHistory = useCallback((cmd: string) => {
    const trimmed = cmd.trim()
    if (!trimmed) {
      return
    }
    setHistory((prev) => {
      const next = [...prev, trimmed].slice(-MAX_CMD_HISTORY_LINES)
      void chrome.storage.local.set({ [CMD_HISTORY_KEY]: next })
      return next
    })
  }, [])

  return {
    lines,
    history,
    appendLogLines,
    appendCommandToHistory
  }
}
