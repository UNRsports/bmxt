import type { SyncConnectionState, SyncDeviceId, TabsChangedReason } from "../types.ts"
import {
  FAMILY_SIGNAL_FIRST_DEFAULT_TAB,
  normalizeFamilySignalFirstCommand,
  type FamilySignalFirstCommand
} from "./family-signal-first.ts"

export {
  FAMILY_SIGNAL_FIRST_DEFAULT_TAB,
  familySignalTargetsTabPicker,
  normalizeFamilySignalFirstCommand,
  type FamilySignalFirstCommand
} from "./family-signal-first.ts"

/**
 * EN: Connected peer ids that should receive a tabs_changed broadcast (excludes self).
 * JA: tabs_changed 广播の宛先（自分以外の connected ピア）。
 */
export function listTabsChangedAnnounceTargets(
  selfDeviceId: SyncDeviceId,
  states: ReadonlyArray<{ deviceId: SyncDeviceId; state: SyncConnectionState }>
): SyncDeviceId[] {
  const targets: SyncDeviceId[] = []
  for (const row of states) {
    if (row.state !== "connected") {
      continue
    }
    if (row.deviceId === selfDeviceId) {
      continue
    }
    if (row.deviceId === "pending-offer") {
      continue
    }
    targets.push(row.deviceId)
  }
  return targets
}

export function normalizeTabsChangedReason(value: unknown): TabsChangedReason {
  if (value === "open_tabs" || value === "tabs_ops" || value === "local_close") {
    return value
  }
  return "tabs_ops"
}

/**
 * EN: Build a local TabsChangedSignal from a wire command (or announce args).
 * JA: ワイヤ／announce 引数からローカル TabsChangedSignal を作る。
 */
export function buildTabsChangedSignal(args: {
  reason: unknown
  first: unknown
}): { reason: TabsChangedReason; first: FamilySignalFirstCommand } | null {
  const first = normalizeFamilySignalFirstCommand(args.first)
  if (first === null) {
    return null
  }
  return {
    reason: normalizeTabsChangedReason(args.reason),
    first
  }
}
