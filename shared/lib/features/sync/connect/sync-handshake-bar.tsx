import { useCallback, useEffect, useState } from "react"
import { tCmd } from "../../setting/i18n/ns/cmd"
import type { UiLocale } from "../../setting/locale"
import { expandSyncLogLines } from "../facade/expand-sync-log"
import { copySyncHandshakeCode } from "./sync-handshake-actions.ts"
import {
  getSyncConnectPending,
  subscribeSyncConnectPending,
  type SyncConnectPending
} from "./sync-connect-pending.ts"
import { isSyncHandshakeCommandMessage } from "./sync-handshake-protocol.ts"

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

  const runCopy = useCallback(async () => {
    const result = await copySyncHandshakeCode()
    const expanded = expandSyncLogLines(result.lines, props.locale)
    await props.appendLogLines(expanded)
    props.focusPrompt()
  }, [props])

  useEffect(() => {
    const onMessage = (message: unknown) => {
      if (!isSyncHandshakeCommandMessage(message)) {
        return
      }
      if (getSyncConnectPending()?.outboundCode == null) {
        return
      }
      void runCopy()
    }
    chrome.runtime.onMessage.addListener(onMessage)
    return () => {
      chrome.runtime.onMessage.removeListener(onMessage)
    }
  }, [runCopy])

  if (pending === null) {
    return null
  }

  const canCopy = pending.outboundCode !== null
  const hint = canCopy
    ? tCmd("cmd.sync.connect.barHintCopy", props.locale, {
        name: pending.peerDisplayName,
        role: pending.role
      })
    : tCmd("cmd.sync.connect.barHintPastePrompt", props.locale, {
        name: pending.peerDisplayName,
        role: pending.role
      })

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
  }, [])

  return (
    <div
      className="bmxt-sync-handshake-bar"
      role="toolbar"
      aria-label={tCmd("cmd.sync.connect.barLabel", props.locale)}>
      <span className="bmxt-sync-handshake-bar-hint">{hint}</span>
      <button
        type="button"
        className="bmxt-sync-handshake-btn"
        disabled={!canCopy}
        aria-label={tCmd("cmd.sync.connect.copyButton", props.locale)}
        onPointerDown={onPointerDown}
        onClick={() => void runCopy()}>
        {tCmd("cmd.sync.connect.copyButton", props.locale)}
      </button>
    </div>
  )
}
