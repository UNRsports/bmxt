import type { SyncConnectRole } from "../bus/connect-role.ts"
import type { SyncDeviceId } from "../types.ts"

export type SyncConnectPending = {
  peerDeviceId: SyncDeviceId
  peerDisplayName: string
  role: SyncConnectRole
  /** EN: Code we produced for the peer to paste (offer or answer). */
  outboundCode: string | null
  /** EN: Waiting for the peer's code (answerer waits for offer; offerer waits for answer). */
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
