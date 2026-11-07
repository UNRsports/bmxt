import {
  compactRtcHandshakeCode,
  RTC_HANDSHAKE_PREFIX
} from "../discovery/rtc-handshake-codec.ts"
import { getSyncService } from "../facade/sync-service.ts"
import { getSyncConnectPending } from "./sync-connect-pending.ts"

function line(token: string): string {
  return token
}

function extractRtcCode(raw: string): string | null {
  const compact = compactRtcHandshakeCode(raw)
  if (!compact.startsWith(RTC_HANDSHAKE_PREFIX)) {
    return null
  }
  if (compact.length < 16 || compact.length > 48_000) {
    return null
  }
  return compact
}

/** EN: Copy the pending outbound handshake code (user-gesture clipboard write). */
export async function copySyncHandshakeCode(): Promise<{ ok: boolean; lines: string[] }> {
  const pending = getSyncConnectPending()
  if (pending === null || pending.outboundCode === null) {
    return { ok: false, lines: [line("sync.connect.copyIdle")] }
  }
  try {
    await navigator.clipboard.writeText(pending.outboundCode)
    return { ok: true, lines: [line("sync.connect.copied")] }
  } catch {
    return {
      ok: false,
      lines: [
        line("sync.connect.clipboardWriteFailed"),
        line(`sync.rtc.code:${pending.outboundCode}`)
      ]
    }
  }
}

/**
 * EN: Read clipboard and apply to the pending connect flow
 *     (answerer → answer; offerer → accept).
 */
export async function pasteApplySyncHandshakeCode(): Promise<{
  ok: boolean
  lines: string[]
}> {
  const pending = getSyncConnectPending()
  if (pending === null || !pending.awaitingInbound) {
    return { ok: false, lines: [line("sync.connect.pasteIdle")] }
  }
  let text: string
  try {
    text = await navigator.clipboard.readText()
  } catch {
    return { ok: false, lines: [line("sync.connect.clipboardReadFailed")] }
  }
  const code = extractRtcCode(text)
  if (code === null) {
    return { ok: false, lines: [line("sync.connect.clipboardNoCode")] }
  }
  if (pending.role === "answer") {
    return getSyncService().answer(code)
  }
  return getSyncService().accept(code)
}
