import type { SyncBusCommand, SyncDeviceId } from "../types"

/**
 * EN: Stabilizer — offline/sleep command queue (FSA sealed envelopes).
 * JA: 休眠時コマンドキュー・スタビライザー。
 */
export type CommandQueueStabilizer = {
  enqueue(toDeviceId: SyncDeviceId, command: SyncBusCommand): Promise<void>
  dequeueFor(toDeviceId: SyncDeviceId): Promise<SyncBusCommand[]>
  pruneExpired(): Promise<number>
}
