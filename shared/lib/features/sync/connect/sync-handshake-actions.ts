import { getSyncConnectPending } from "./sync-connect-pending.ts"

function line(token: string): string {
  return token
}

/**
 * EN: Copy the pending outbound Family invite or RTC handshake code
 *     (user-gesture clipboard write — no manual text selection).
 */
export async function copySyncHandshakeCode(): Promise<{ ok: boolean; lines: string[] }> {
  const pending = getSyncConnectPending()
  if (pending === null || pending.outboundCode === null) {
    return { ok: false, lines: [line("sync.connect.copyIdle")] }
  }
  try {
    await navigator.clipboard.writeText(pending.outboundCode)
    if (pending.kind === "invite") {
      return { ok: true, lines: [line("sync.connect.copiedInvite")] }
    }
    return { ok: true, lines: [line("sync.connect.copied")] }
  } catch {
    // EN: Last-resort dump only when clipboard.writeText fails.
    const dumpKind = pending.kind === "invite" ? "sync.pair.invite" : "sync.rtc.code"
    return {
      ok: false,
      lines: [
        line("sync.connect.clipboardWriteFailed"),
        line(`${dumpKind}:${pending.outboundCode}`)
      ]
    }
  }
}
