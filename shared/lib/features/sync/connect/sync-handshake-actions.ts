import { getSyncConnectPending } from "./sync-connect-pending.ts"

function line(token: string): string {
  return token
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
