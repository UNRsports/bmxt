import { useCallback, useEffect, useState } from "react"
import { SESSION_LOG_KEY } from "../extension-storage/keys"
import { appendLines, loadLog } from "./session-log"

export function useSessionLog(): {
  lines: string[] | null
  appendLogLines: (newLines: string[]) => Promise<void>
} {
  const [lines, setLines] = useState<string[] | null>(null)

  useEffect(() => {
    void loadLog().then(setLines)

    const onChange: Parameters<typeof chrome.storage.onChanged.addListener>[0] = (
      changes,
      area
    ) => {
      if (area !== "local") {
        return
      }
      const ch = changes[SESSION_LOG_KEY]
      if (ch?.newValue !== undefined) {
        setLines(ch.newValue as string[])
      }
    }
    chrome.storage.onChanged.addListener(onChange)
    return () => chrome.storage.onChanged.removeListener(onChange)
  }, [])

  const appendLogLines = useCallback(async (newLines: string[]) => {
    await appendLines(newLines)
  }, [])

  return { lines, appendLogLines }
}
