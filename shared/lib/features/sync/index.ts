export type { SyncStabilizers } from "./stabilizers"
export type { DiscoveryStabilizer } from "./stabilizers/discovery"
export type { PeerHostStabilizer } from "./stabilizers/peer-host"
export type { CommandBusStabilizer } from "./stabilizers/command-bus"
export type { CommandQueueStabilizer } from "./stabilizers/command-queue"

export type {
  SyncDeviceIdentity,
  SyncFamilyMembership,
  SyncRosterMember,
  SyncStatusSnapshot,
  SyncBusCommand,
  SyncInviteV1
} from "./types"

export { createDefaultSyncStabilizers } from "./facade/default-stabilizers"
export {
  createSyncService,
  getSyncService,
  setSyncServiceForTests,
  type SyncService
} from "./facade/sync-service"
export { expandSyncLogLines } from "./facade/expand-sync-log"
export { formatSyncStatusLines } from "./facade/format-status"
export { compareLww, shouldAcceptLww } from "./payload/conflict-lww"
export { SYNC_PREFS_ALLOWLIST, isSyncPrefKey } from "./payload/prefs-allowlist"
export { parseInvite, formatInvite } from "./discovery/invite-codec"
export {
  formatRtcHandshakeCode,
  parseRtcHandshakeCode,
  RTC_HANDSHAKE_PREFIX
} from "./discovery/rtc-handshake-codec"
export { sanitizeRemoteOpenUrls, sanitizeGroupTitle } from "./bus/remote-open-sanitize.ts"
export { applyRemoteOpenTabs } from "./bus/remote-open.ts"
export {
  parseDeviceListScopeTokens,
  stripDeviceScopeFromSearchDispatchLine,
  type DeviceListScope
} from "./bus/device-list-scope.ts"
