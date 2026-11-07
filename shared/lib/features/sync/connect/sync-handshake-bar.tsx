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

function hintForPending(pending: SyncConnectPending, locale: UiLocale): string {
  if (pending.outboundCode !== null) {
    if (pending.kind === "invite") {
      return tCmd("cmd.sync.connect.barHintCopyInvite", locale)
    }
    return tCmd("cmd.sync.connect.barHintCopy", locale, {
      name: pending.peerDisplayName,
      role: pending.role ?? "handshake"
    })
  }
  if (pending.kind === "invite") {
    return tCmd("cmd.sync.connect.barHintPasteInvite", locale)
  }
  return tCmd("cmd.sync.connect.barHintPastePrompt", locale, {
    name: pending.peerDisplayName,
    role: pending.role ?? "handshake"
  })
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

  // EN: Keep focus on the prompt IME — must be declared before any early return (Rules of Hooks).
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
  }, [])

  if (pending === null) {
    return null
  }

  const canCopy = pending.outboundCode !== null

  return (
    <div
      className="bmxt-sync-handshake-bar"
      role="toolbar"
      aria-label={tCmd("cmd.sync.connect.barLabel", props.locale)}>
      <span className="bmxt-sync-handshake-bar-hint">
        {hintForPending(pending, props.locale)}
      </span>
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
