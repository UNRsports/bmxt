import type {
  SyncBusCommand,
  SyncConnectionState,
  SyncDeviceId,
  SyncRemoteSearchHit,
  SyncRemoteTabRow,
  SyncTabsOp
} from "../types"

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
  ): Promise<{ ok: boolean; detail: string | null; openedUrls: string[] }>
  listTabs(
    remoteDeviceId: SyncDeviceId,
    showUrl: boolean
  ): Promise<{ ok: boolean; detail: string | null; rows: SyncRemoteTabRow[] }>
  searchQuery(
    remoteDeviceId: SyncDeviceId,
    dispatchLine: string
  ): Promise<{ ok: boolean; detail: string | null; hits: SyncRemoteSearchHit[] }>
  tabsOps(
    remoteDeviceId: SyncDeviceId,
    op: SyncTabsOp
  ): Promise<{ ok: boolean; detail: string | null }>
  getState(remoteDeviceId: SyncDeviceId): SyncConnectionState
  listStates(): Array<{ deviceId: SyncDeviceId; state: SyncConnectionState }>
  /** EN: Drop a tracked device id (e.g. offer placeholder after answer binds the real peer). */
  discardState(remoteDeviceId: SyncDeviceId): void
  /** EN: Notify when any tracked connection state changes. */
  subscribeStates(listener: () => void): () => void
  /** EN: Drain FSA command queue for this device (peer wake). */
  drainQueue(): Promise<number>
  onCommand(handler: (command: SyncBusCommand) => void | Promise<void>): void
}
