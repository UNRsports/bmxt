import type {
  SyncBusCommand,
  SyncConnectionState,
  SyncDeviceId,
  SyncRemoteSearchHit,
  SyncRemoteTabRow,
  SyncTabsOp,
  TabsChangedReason,
  TabsChangedSignal
} from "../types"
import type { FamilySignalFirstCommand } from "../bus/family-signal-first.ts"

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
    groupTitle: string | null,
    windowId?: number | null
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
  /**
   * EN: Broadcast tabs_changed to all connected Family peers and notify local subscribers.
   * JA: 接続中 Family ピアへ tabs_changed を广播し、ローカル購読者にも通知する。
   * @param first First-command selection code (default `"tab"`).
   */
  announceTabsChanged(
    reason: TabsChangedReason,
    first?: FamilySignalFirstCommand
  ): Promise<void>
  getState(remoteDeviceId: SyncDeviceId): SyncConnectionState
  listStates(): Array<{ deviceId: SyncDeviceId; state: SyncConnectionState }>
  /** EN: Drop a tracked device id (e.g. offer placeholder after answer binds the real peer). */
  discardState(remoteDeviceId: SyncDeviceId): void
  /** EN: Notify when any tracked connection state changes. */
  subscribeStates(listener: () => void): () => void
  /** EN: Notify when Family inventory may have changed (local or remote signal). */
  subscribeTabsChanged(listener: (signal: TabsChangedSignal) => void): () => void
  /** EN: Drain FSA command queue for this device (peer wake). */
  drainQueue(): Promise<number>
  onCommand(handler: (command: SyncBusCommand) => void | Promise<void>): void
}
