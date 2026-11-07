import type { ListResult } from "../../command-line/list-output/types.ts"
import { LIST_OUTPUT_SCHEMA } from "../../command-line/list-output/types.ts"
import type { UiLocale } from "../../setting/locale.ts"
import { buildTabPickerRowsBundle } from "../../tabs/picker-rows.ts"
import { tabPickerRowsToListResult } from "../../tabs/tabs-list-result.ts"
import { loadOrCreateDeviceIdentity } from "../device/device-identity"
import { getSyncService } from "../facade/sync-service.ts"
import type { DeviceListScope } from "./device-list-scope"
import {
  mergeListResults,
  remoteTabRowsToListRecords,
  tagListRecords,
  type DeviceTag
} from "./tag-list-records"

export type CrossDeviceTabsFetchOptions = {
  showUrl: boolean
  locale: UiLocale
  scope: DeviceListScope
}

export type CrossDeviceFetchMeta = {
  devicesQueried: string[]
  devicesFailed: string[]
}

async function localTaggedTabs(
  showUrl: boolean,
  locale: UiLocale,
  tag: DeviceTag
): Promise<ListResult> {
  const bundle = await buildTabPickerRowsBundle(showUrl, locale)
  const local = tabPickerRowsToListResult(bundle.rows, locale)
  return {
    ...local,
    records: tagListRecords(local.records, tag)
  }
}

/**
 * EN: Fetch tab ListResult for local / one peer / local+connected peers.
 * JA: ローカル・単一ピア・接続ピア横断のタブ ListResult を取得する。
 */
export async function fetchCrossDeviceTabsList(
  options: CrossDeviceTabsFetchOptions
): Promise<{ result: ListResult; meta: CrossDeviceFetchMeta; notices: string[] }> {
  const device = await loadOrCreateDeviceIdentity()
  const localTag: DeviceTag = {
    deviceId: device.deviceId,
    deviceName: device.displayName,
    remote: false
  }
  const notices: string[] = []
  const devicesQueried: string[] = []
  const devicesFailed: string[] = []

  if (options.scope.kind === "local") {
    // EN: Preserve legacy plain labels when no cross-device flag is set.
    const bundle = await buildTabPickerRowsBundle(options.showUrl, options.locale)
    const local = tabPickerRowsToListResult(bundle.rows, options.locale)
    devicesQueried.push(device.deviceId)
    return {
      result: local,
      meta: { devicesQueried, devicesFailed },
      notices
    }
  }

  const service = getSyncService()

  if (options.scope.kind === "device") {
    devicesQueried.push(options.scope.deviceId)
    const remote = await service.listRemoteTabs(options.scope.deviceId, options.showUrl)
    if (!remote.ok) {
      devicesFailed.push(options.scope.deviceId)
      notices.push(`sync.list.peerFailed:${options.scope.deviceId}:${remote.detail ?? ""}`)
      return {
        result: {
          schema: LIST_OUTPUT_SCHEMA,
          command: "tab",
          subcommand: "-list",
          records: [],
          meta: {
            devicesQueried: devicesQueried.join(","),
            devicesFailed: devicesFailed.join(","),
            syncNotices: notices.join("\n")
          }
        },
        meta: { devicesQueried, devicesFailed },
        notices
      }
    }
    const status = await service.status()
    const remoteId = options.scope.deviceId
    const name =
      status.members.find((m) => m.deviceId === remoteId)?.displayName ?? remoteId
    const records = remoteTabRowsToListRecords(remote.rows, {
      deviceId: remoteId,
      deviceName: name,
      remote: true
    })
    return {
      result: {
        schema: LIST_OUTPUT_SCHEMA,
        command: "tab",
        subcommand: "-list",
        records,
        meta:
          notices.length > 0
            ? {
                devicesQueried: devicesQueried.join(","),
                devicesFailed: devicesFailed.join(","),
                syncNotices: notices.join("\n")
              }
            : {
                devicesQueried: devicesQueried.join(","),
                devicesFailed: devicesFailed.join(",")
              }
      },
      meta: { devicesQueried, devicesFailed },
      notices
    }
  }

  // --peers: local + connected remotes (refresh from bound RTC sessions first)
  const parts: ListResult[] = []
  const local = await localTaggedTabs(options.showUrl, options.locale, localTag)
  parts.push(local)
  devicesQueried.push(device.deviceId)

  // EN: Prefer peerHost-bound sessions over a possibly stale commandBus map.
  const connectedIds = await service.listConnectedPeerDeviceIds()
  const memberNameById = new Map<string, string>()
  for (const member of (await service.status()).members) {
    memberNameById.set(member.deviceId, member.displayName)
  }

  for (const remoteId of connectedIds) {
    devicesQueried.push(remoteId)
    const remote = await service.listRemoteTabs(remoteId, options.showUrl)
    if (!remote.ok) {
      devicesFailed.push(remoteId)
      notices.push(`sync.list.peerFailed:${remoteId}:${remote.detail ?? ""}`)
      continue
    }
    const name = memberNameById.get(remoteId) ?? remoteId
    parts.push({
      schema: LIST_OUTPUT_SCHEMA,
      command: "tab",
      subcommand: "-list",
      records: remoteTabRowsToListRecords(remote.rows, {
        deviceId: remoteId,
        deviceName: name,
        remote: true
      })
    })
  }

  if (connectedIds.length === 0) {
    notices.push("sync.list.noConnectedPeers")
  }

  return {
    result: mergeListResults("tab", "-list", parts, {
      devicesQueried: devicesQueried.join(","),
      devicesFailed: devicesFailed.join(","),
      syncNotices: notices.length > 0 ? notices.join("\n") : undefined
    }),
    meta: { devicesQueried, devicesFailed },
    notices
  }
}
