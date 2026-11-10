import type { SyncConnectRole } from "../bus/connect-role.ts"
import type { SyncDeviceId } from "../types.ts"

/** EN: What the Copy bar / shortcut currently holds for the peer. */
export type SyncOutboundCodeKind = "invite" | "handshake"

export type SyncConnectPending = {
  kind: SyncOutboundCodeKind
  peerDeviceId: SyncDeviceId | "*"
  peerDisplayName: string
  /** EN: Handshake role; null while an invite is the outbound payload. */
  role: SyncConnectRole | null
  /** EN: Code we produced for the peer (Family invite or RTC handshake). */
  outboundCode: string | null
  /** EN: Waiting for the peer's code at the prompt (invite join or RTC paste). */
  awaitingInbound: boolean
}

let pending: SyncConnectPending | null = null

const listeners = new Set<() => void>()

function notify(): void {
  for (const listener of listeners) {
    listener()
  }
}

export function getSyncConnectPending(): SyncConnectPending | null {
  return pending
}

export function setSyncConnectPending(next: SyncConnectPending | null): void {
  pending = next
  notify()
}

export function clearSyncConnectPending(): void {
  pending = null
  notify()
}

export function subscribeSyncConnectPending(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
