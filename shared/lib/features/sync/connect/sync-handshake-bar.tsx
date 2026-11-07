import { useCallback, useEffect, useState } from "react"
import { tCmd } from "../../setting/i18n/ns/cmd"
import type { UiLocale } from "../../setting/locale"
import { expandSyncLogLines } from "../facade/expand-sync-log"
import {
  copySyncHandshakeCode,
  pasteApplySyncHandshakeCode
} from "./sync-handshake-actions.ts"
import {
  getSyncConnectPending,
  subscribeSyncConnectPending,
  type SyncConnectPending
} from "./sync-connect-pending.ts"
import {
  isSyncHandshakeCommandMessage,
  type SyncHandshakeCommandAction
} from "./sync-handshake-protocol.ts"

export type SyncHandshakeBarProps = {
  locale: UiLocale
  appendLogLines: (lines: string[]) => void | Promise<void>
  focusPrompt: () => void
}

export function SyncHandshakeBar(props: SyncHandshakeBarProps) {
  const [pending, setPending] = useState<SyncConnectPending | null>(() =>
    getSyncConnectPending()
  )

  useEffect(() => {
    return subscribeSyncConnectPending(() => {
      setPending(getSyncConnectPending())
    })
  }, [])

  const runAction = useCallback(
    async (action: SyncHandshakeCommandAction) => {
      const result =
        action === "copy"
          ? await copySyncHandshakeCode()
          : await pasteApplySyncHandshakeCode()
      const expanded = expandSyncLogLines(result.lines, props.locale)
      await props.appendLogLines(expanded)
      props.focusPrompt()
    },
    [props]
  )

  useEffect(() => {
    const onMessage = (message: unknown) => {
      if (!isSyncHandshakeCommandMessage(message)) {
        return
      }
      if (getSyncConnectPending() === null) {
        return
      }
      void runAction(message.action)
    }
    chrome.runtime.onMessage.addListener(onMessage)
    return () => {
      chrome.runtime.onMessage.removeListener(onMessage)
    }
  }, [runAction])

  if (pending === null) {
    return null
  }

  const canCopy = pending.outboundCode !== null
  const canPaste = pending.awaitingInbound

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
  }, [])

  return (
    <div
      className="bmxt-sync-handshake-bar"
      role="toolbar"
      aria-label={tCmd("cmd.sync.connect.barLabel", props.locale)}>
      <span className="bmxt-sync-handshake-bar-hint">
        {tCmd("cmd.sync.connect.barHint", props.locale, {
          name: pending.peerDisplayName,
          role: pending.role
        })}
      </span>
      <button
        type="button"
        className="bmxt-sync-handshake-btn"
        disabled={!canCopy}
        aria-label={tCmd("cmd.sync.connect.copyButton", props.locale)}
        onPointerDown={onPointerDown}
        onClick={() => void runAction("copy")}>
        {tCmd("cmd.sync.connect.copyButton", props.locale)}
      </button>
      <button
        type="button"
        className="bmxt-sync-handshake-btn"
        disabled={!canPaste}
        aria-label={tCmd("cmd.sync.connect.pasteButton", props.locale)}
        onPointerDown={onPointerDown}
        onClick={() => void runAction("paste")}>
        {tCmd("cmd.sync.connect.pasteButton", props.locale)}
      </button>
    </div>
  )
}
