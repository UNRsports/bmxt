/** EN: Hydrate TabPickerRow[] from a tabs ListResult (cross-device browse). */

import type { ListResult } from "../../command-line/list-output/types.ts"
import type { TabPickerRow } from "../../tabs/picker-rows.ts"
import type { DeviceListScope } from "../../sync/bus/device-list-scope.ts"
import { portableRemoteFavIconUrl } from "../../tabs/tab-favicon-url.ts"

function numberField(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }
  return fallback
}

function stringField(value: unknown, fallback = ""): string {
  if (typeof value === "string") {
    return value
  }
  return fallback
}

function boolField(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") {
    return value
  }
  return fallback
}

function optionalString(value: unknown): string | null {
  if (typeof value === "string" && value.length > 0) {
    return value
  }
  return null
}

/**
 * EN: Build picker rows from ListResult. Remote rows keep peer-local ids in peer*
 * and use negative synthetic picker ids so marks never collide with local tabs.
 */
export function tabPickerRowsFromListResult(listResult: ListResult): TabPickerRow[] {
  let nextSynthetic = -2
  const allocSynthetic = (): number => {
    const id = nextSynthetic
    nextSynthetic -= 1
    return id
  }
  /** EN: peer windowId → synthetic picker windowId (per device). */
  const windowSynth = new Map<string, number>()
  /** EN: peer groupId → synthetic picker groupId (per device+window). */
  const groupSynth = new Map<string, number>()

  function synthWindow(deviceId: string, peerWindowId: number, remote: boolean): number {
    if (!remote) {
      return peerWindowId
    }
    const key = `${deviceId}:${peerWindowId}`
    const existing = windowSynth.get(key)
    if (existing !== undefined) {
      return existing
    }
    const id = allocSynthetic()
    windowSynth.set(key, id)
    return id
  }

  function synthGroup(
    deviceId: string,
    peerWindowId: number,
    peerGroupId: number | null,
    remote: boolean
  ): number | null {
    if (peerGroupId === null) {
      return null
    }
    if (!remote) {
      return peerGroupId
    }
    const key = `${deviceId}:${peerWindowId}:${peerGroupId}`
    const existing = groupSynth.get(key)
    if (existing !== undefined) {
      return existing
    }
    const id = allocSynthetic()
    groupSynth.set(key, id)
    return id
  }

  const rows: TabPickerRow[] = []
  for (const record of listResult.records) {
    const deviceId = optionalString(record.fields.deviceId)
    const remote = record.fields.remote === true
    if (record.kind === "tabs.window") {
      const peerWindowId = numberField(record.fields.windowId, -1)
      const windowId = synthWindow(deviceId ?? "local", peerWindowId, remote)
      rows.push({
        kind: "window",
        windowId,
        label: stringField(record.display?.label, stringField(record.fields.title)),
        windowTitle: stringField(record.fields.title),
        usesActiveTabTitle: false,
        focused: boolField(record.fields.focused),
        deviceId,
        remote,
        peerWindowId: remote ? peerWindowId : null
      })
      continue
    }
    if (record.kind === "tabs.group") {
      const groupIdRaw = record.fields.groupId
      const peerGroupId =
        typeof groupIdRaw === "number" && Number.isFinite(groupIdRaw) ? groupIdRaw : null
      const peerWindowId = numberField(record.fields.windowId, -1)
      const windowId = synthWindow(deviceId ?? "local", peerWindowId, remote)
      const groupId = synthGroup(deviceId ?? "local", peerWindowId, peerGroupId, remote)
      rows.push({
        kind: "group",
        windowId,
        groupId,
        label: stringField(record.display?.label, stringField(record.fields.label)),
        color: "grey",
        deviceId,
        remote,
        peerWindowId: remote ? peerWindowId : null,
        peerGroupId: remote ? peerGroupId : null
      })
      continue
    }
    if (record.kind === "tabs.tab") {
      const groupIdRaw = record.fields.groupId
      const peerGroupId =
        typeof groupIdRaw === "number" && Number.isFinite(groupIdRaw) ? groupIdRaw : null
      const peerWindowId = numberField(record.fields.windowId, -1)
      const peerTabIdRaw =
        typeof record.fields.remoteTabId === "number" && Number.isFinite(record.fields.remoteTabId)
          ? record.fields.remoteTabId
          : numberField(record.fields.tabId, -1)
      const windowId = synthWindow(deviceId ?? "local", peerWindowId, remote)
      const groupId = synthGroup(deviceId ?? "local", peerWindowId, peerGroupId, remote)
      const tabId = remote ? allocSynthetic() : peerTabIdRaw
      // EN: Remote rows carry portable favIconUrl over WebRTC; local rows keep null here
      //     (live picker path resolves favicons separately).
      // JA: リモート行は WebRTC の可搬 favIconUrl を使う。ローカル行はここは null
      //     （live picker 側で解決）。
      const remoteFavIconSrc = remote
        ? portableRemoteFavIconUrl(
            typeof record.fields.favIconUrl === "string" ? record.fields.favIconUrl : null
          )
        : null
      rows.push({
        kind: "tab",
        tabId,
        windowId,
        groupId,
        groupColor: null,
        title: stringField(record.display?.label, stringField(record.fields.title)),
        url: stringField(record.fields.url),
        faviconSrc: remoteFavIconSrc,
        active: remote ? false : boolField(record.fields.active),
        deviceId,
        remote,
        peerTabId: remote ? peerTabIdRaw : null,
        peerWindowId: remote ? peerWindowId : null,
        peerGroupId: remote ? peerGroupId : null
      })
    }
  }
  return rows
}

export function listResultHasRemoteTabs(listResult: ListResult): boolean {
  return listResult.records.some(
    (record) =>
      (record.kind === "tabs.tab" ||
        record.kind === "tabs.group" ||
        record.kind === "tabs.window") &&
      record.fields.remote === true
  )
}

export function listResultHasDeviceTaggedTabs(listResult: ListResult): boolean {
  return listResult.records.some(
    (record) =>
      (record.kind === "tabs.tab" ||
        record.kind === "tabs.group" ||
        record.kind === "tabs.window") &&
      typeof record.fields.deviceId === "string" &&
      record.fields.deviceId.length > 0
  )
}

/**
 * EN: Infer DeviceListScope from a tagged tabs ListResult (for picker refresh).
 * JA: タグ付き ListResult からピッカー再取得用の DeviceListScope を推定する。
 */
export function deviceListScopeFromTabsListResult(listResult: ListResult): DeviceListScope {
  const deviceIds = new Set<string>()
  let hasRemote = false
  let hasLocalTagged = false
  for (const record of listResult.records) {
    if (
      record.kind !== "tabs.tab" &&
      record.kind !== "tabs.group" &&
      record.kind !== "tabs.window"
    ) {
      continue
    }
    const deviceId = optionalString(record.fields.deviceId)
    if (deviceId !== null) {
      deviceIds.add(deviceId)
    }
    if (record.fields.remote === true) {
      hasRemote = true
    } else if (deviceId !== null) {
      hasLocalTagged = true
    }
  }
  if (!hasRemote && !hasLocalTagged) {
    return { kind: "local" }
  }
  if (hasRemote && !hasLocalTagged && deviceIds.size === 1) {
    const only = [...deviceIds][0]
    if (only !== undefined) {
      return { kind: "device", deviceId: only }
    }
  }
  if (hasRemote) {
    return { kind: "peers" }
  }
  return { kind: "local" }
}
