import type { SyncBusCommand, SyncConnectionState, SyncDeviceId } from "../types"

/**
 * EN: Stabilizer — low-latency command bus over DataChannel (+ queue fallback).
 * JA: DataChannel コマンドバス（キュー退避付き）スタビライザー。
 */
export type CommandBusStabilizer = {
  connect(remoteDeviceId: SyncDeviceId): Promise<SyncConnectionState>
  disconnect(remoteDeviceId: SyncDeviceId): Promise<void>
  ping(remoteDeviceId: SyncDeviceId): Promise<{ ok: boolean; rttMs: number | null }>
  openTabs(
    remoteDeviceId: SyncDeviceId,
    urls: string[],
    groupTitle: string | null
  ): Promise<{ ok: boolean; detail: string | null }>
  getState(remoteDeviceId: SyncDeviceId): SyncConnectionState
  listStates(): Array<{ deviceId: SyncDeviceId; state: SyncConnectionState }>
  /** EN: Drain FSA command queue for this device (peer wake). */
  drainQueue(): Promise<number>
  onCommand(handler: (command: SyncBusCommand) => void | Promise<void>): void
}
