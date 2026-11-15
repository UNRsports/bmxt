/**
 * EN: While Family peers are WebRTC-connected, broadcast tabs_changed when this
 *     browser's tab / window / group inventory changes (so open peer pickers refresh).
 * JA: Family ピアが WebRTC 接続中、自端末のタブ／窓／グループ在庫が変わったら
 *     tabs_changed を广播し、開いている相手側 picker を再取得させる。
 */

import { shouldRebuildRowsOnTabUpdated } from "../../tabs/tab-picker-chrome-sync-filters.ts"
import { loadOrCreateDeviceIdentity } from "../device/device-identity.ts"
import type { CommandBusStabilizer } from "../stabilizers/command-bus.ts"
import {
  createLocalInventoryAnnounceScheduler,
  LOCAL_INVENTORY_ANNOUNCE_DEBOUNCE_MS
} from "./local-inventory-announce-schedule.ts"
import {
  FAMILY_SIGNAL_FIRST_DEFAULT_TAB,
  listTabsChangedAnnounceTargets,
  shouldAnnounceLocalInventoryToPeers
} from "./tabs-changed-announce.ts"

export {
  createLocalInventoryAnnounceScheduler,
  LOCAL_INVENTORY_ANNOUNCE_DEBOUNCE_MS
} from "./local-inventory-announce-schedule.ts"

type LocalInventoryAnnounceDeps = {
  commandBus: CommandBusStabilizer
  /** EN: Override for tests. */
  debounceMs?: number
  /** EN: Override for tests (skip chrome listeners). */
  scheduleAnnounce?: () => void
}

type ChromeLike = {
  tabs?: {
    onCreated?: { addListener: (cb: () => void) => void; removeListener: (cb: () => void) => void }
    onRemoved?: { addListener: (cb: () => void) => void; removeListener: (cb: () => void) => void }
    onMoved?: { addListener: (cb: () => void) => void; removeListener: (cb: () => void) => void }
    onAttached?: { addListener: (cb: () => void) => void; removeListener: (cb: () => void) => void }
    onDetached?: { addListener: (cb: () => void) => void; removeListener: (cb: () => void) => void }
    onReplaced?: { addListener: (cb: () => void) => void; removeListener: (cb: () => void) => void }
    onUpdated?: {
      addListener: (
        cb: (tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => void
      ) => void
      removeListener: (
        cb: (tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => void
      ) => void
    }
  }
  windows?: {
    onCreated?: { addListener: (cb: () => void) => void; removeListener: (cb: () => void) => void }
    onRemoved?: { addListener: (cb: () => void) => void; removeListener: (cb: () => void) => void }
  }
  tabGroups?: {
    onCreated?: { addListener: (cb: () => void) => void; removeListener: (cb: () => void) => void }
    onUpdated?: { addListener: (cb: () => void) => void; removeListener: (cb: () => void) => void }
    onRemoved?: { addListener: (cb: () => void) => void; removeListener: (cb: () => void) => void }
    onMoved?: { addListener: (cb: () => void) => void; removeListener: (cb: () => void) => void }
  }
}

function readChrome(): ChromeLike | null {
  const g = globalThis as typeof globalThis & { chrome?: ChromeLike }
  if (g.chrome === undefined) {
    return null
  }
  return g.chrome
}

/**
 * EN: Wire local Chrome inventory → Family tabs_changed (idempotent).
 * JA: ローカル Chrome 在庫 → Family tabs_changed を配線（冪等）。
 */
export function installLocalInventoryAnnounce(deps: LocalInventoryAnnounceDeps): () => void {
  const globalRef = globalThis as typeof globalThis & {
    __bmxt_local_inventory_announce_installed__?: boolean
  }
  if (globalRef.__bmxt_local_inventory_announce_installed__) {
    return () => {
      /* already installed */
    }
  }
  globalRef.__bmxt_local_inventory_announce_installed__ = true

  const chromeApi = readChrome()
  const debounceMs = deps.debounceMs ?? LOCAL_INVENTORY_ANNOUNCE_DEBOUNCE_MS

  const flush = async (): Promise<void> => {
    const device = await loadOrCreateDeviceIdentity()
    const targets = listTabsChangedAnnounceTargets(device.deviceId, deps.commandBus.listStates())
    if (!shouldAnnounceLocalInventoryToPeers(targets.length)) {
      return
    }
    await deps.commandBus.announceTabsChanged(
      "local_inventory",
      FAMILY_SIGNAL_FIRST_DEFAULT_TAB
    )
  }

  const scheduler = createLocalInventoryAnnounceScheduler({
    debounceMs,
    flush
  })
  const schedule = deps.scheduleAnnounce ?? scheduler.schedule

  if (chromeApi === null) {
    return () => {
      scheduler.cancel()
      globalRef.__bmxt_local_inventory_announce_installed__ = false
    }
  }

  const onStructuralTabUpdated = (
    _tabId: number,
    changeInfo: chrome.tabs.TabChangeInfo
  ): void => {
    if (shouldRebuildRowsOnTabUpdated(changeInfo)) {
      schedule()
    }
  }

  const tabs = chromeApi.tabs
  const windows = chromeApi.windows
  const tabGroups = chromeApi.tabGroups

  tabs?.onCreated?.addListener(schedule)
  tabs?.onRemoved?.addListener(schedule)
  tabs?.onMoved?.addListener(schedule)
  tabs?.onAttached?.addListener(schedule)
  tabs?.onDetached?.addListener(schedule)
  tabs?.onReplaced?.addListener(schedule)
  tabs?.onUpdated?.addListener(onStructuralTabUpdated)

  windows?.onCreated?.addListener(schedule)
  windows?.onRemoved?.addListener(schedule)

  tabGroups?.onCreated?.addListener(schedule)
  tabGroups?.onUpdated?.addListener(schedule)
  tabGroups?.onRemoved?.addListener(schedule)
  tabGroups?.onMoved?.addListener(schedule)

  return () => {
    scheduler.cancel()
    tabs?.onCreated?.removeListener(schedule)
    tabs?.onRemoved?.removeListener(schedule)
    tabs?.onMoved?.removeListener(schedule)
    tabs?.onAttached?.removeListener(schedule)
    tabs?.onDetached?.removeListener(schedule)
    tabs?.onReplaced?.removeListener(schedule)
    tabs?.onUpdated?.removeListener(onStructuralTabUpdated)

    windows?.onCreated?.removeListener(schedule)
    windows?.onRemoved?.removeListener(schedule)

    tabGroups?.onCreated?.removeListener(schedule)
    tabGroups?.onUpdated?.removeListener(schedule)
    tabGroups?.onRemoved?.removeListener(schedule)
    tabGroups?.onMoved?.removeListener(schedule)

    globalRef.__bmxt_local_inventory_announce_installed__ = false
  }
}
