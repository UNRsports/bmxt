import { useEffect } from "react"

import {
  ensureTerminalSessionsState,
  readTerminalSessionsIfPresent
} from "../bmxt-window/terminal-sessions/state-storage"
import type { TerminalSessionsStateV1 } from "../bmxt-window/terminal-sessions/types"
import { subscribeSessionLogCache, getSessionLogCache } from "./cache"
import {
  isSessionLogMessage,
  SESSION_LOG_APPEND,
  SESSION_LOG_SET,
  SESSION_STATE_SYNC
} from "./messages"
import {
  applyReplayedSessionLogAppend,
  applyReplayedSessionLogSet,
  commitSessionLogState,
  seedSessionLogCache
} from "./mutations"

type Options = {
  onState: (state: TerminalSessionsStateV1 | null) => void
}

async function ensureCachedSessionsForReplay(): Promise<TerminalSessionsStateV1 | null> {
  const cached = getSessionLogCache()
  if (cached) {
    return cached
  }
  const fromDisk = await readTerminalSessionsIfPresent()
  if (fromDisk) {
    return fromDisk
  }
  return ensureTerminalSessionsState()
}

/**
 * EN: UI tab — subscribe to in-memory log cache + SW push messages for instant display.
 */
export function useSessionLogSync({ onState }: Options): void {
  useEffect(() => {
    return subscribeSessionLogCache((state) => {
      onState(state)
    })
  }, [onState])

  useEffect(() => {
    const onMessage: Parameters<typeof chrome.runtime.onMessage.addListener>[0] = (
      message
    ) => {
      if (!isSessionLogMessage(message)) {
        return
      }
      if (message.type === SESSION_STATE_SYNC) {
        if (message.state === null) {
          onState(null)
          return
        }
        seedSessionLogCache(message.state)
        void commitSessionLogState(message.state, { replay: true })
        onState(message.state)
        return
      }
      void (async () => {
        const cached = await ensureCachedSessionsForReplay()
        if (message.type === SESSION_LOG_APPEND) {
          const next = applyReplayedSessionLogAppend(
            cached,
            message.sessionId,
            message.lines
          )
          void commitSessionLogState(next, { replay: true })
          onState(next)
          return
        }
        if (message.type === SESSION_LOG_SET) {
          const next = applyReplayedSessionLogSet(cached, message.sessionId, message.lines)
          void commitSessionLogState(next, { replay: true })
          onState(next)
        }
      })()
    }
    chrome.runtime.onMessage.addListener(onMessage)
    return () => chrome.runtime.onMessage.removeListener(onMessage)
  }, [onState])
}
