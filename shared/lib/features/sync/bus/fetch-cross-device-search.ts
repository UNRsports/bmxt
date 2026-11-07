import type { ListResult } from "../../command-line/list-output/types.ts"
import { LIST_OUTPUT_SCHEMA } from "../../command-line/list-output/types.ts"
import type { DispatchHostContext } from "../../dispatch/dispatch-context.ts"
import { fetchSearchListResult } from "../../search/search-list-plain.ts"
import type { UiLocale } from "../../setting/locale.ts"
import { loadOrCreateDeviceIdentity } from "../device/device-identity"
import { getSyncService } from "../facade/sync-service.ts"
import type { DeviceListScope } from "./device-list-scope"
import { stripDeviceScopeFromSearchDispatchLine } from "./device-list-scope"
import type { CrossDeviceFetchMeta } from "./fetch-cross-device-tabs"
import {
  mergeListResults,
  remoteSearchHitsToListRecords,
  tagListRecords,
  type DeviceTag
} from "./tag-list-records"

export type CrossDeviceSearchFetchOptions = {
  dispatchLine: string
  locale: UiLocale
  ctx: DispatchHostContext
  scope: DeviceListScope
  onProgress?: (message: string) => Promise<void>
}

async function localTaggedSearch(
  options: CrossDeviceSearchFetchOptions,
  peerLine: string,
  tag: DeviceTag
): Promise<ListResult> {
  const local = await fetchSearchListResult({
    dispatchLine: peerLine,
    ctx: options.ctx,
    locale: options.locale,
    onProgress: options.onProgress
  })
  return {
    ...local,
    records: tagListRecords(local.records, tag)
  }
}

/**
 * EN: Fetch search ListResult for local / one peer / local+connected peers.
 * JA: ローカル・単一ピア・接続ピア横断の search ListResult を取得する。
 */
export async function fetchCrossDeviceSearchList(
  options: CrossDeviceSearchFetchOptions
): Promise<{ result: ListResult; meta: CrossDeviceFetchMeta; notices: string[] }> {
  const peerLine = stripDeviceScopeFromSearchDispatchLine(options.dispatchLine)
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
    // EN: Preserve legacy search labels when no cross-device flag is set.
    const local = await fetchSearchListResult({
      dispatchLine: peerLine,
      ctx: options.ctx,
      locale: options.locale,
      onProgress: options.onProgress
    })
    devicesQueried.push(device.deviceId)
    return {
      result: local,
      meta: { devicesQueried, devicesFailed },
      notices
    }
  }

  const service = getSyncService()

  if (options.scope.kind === "device") {
    const remoteId = options.scope.deviceId
    devicesQueried.push(remoteId)
    const remote = await service.searchRemote(remoteId, peerLine)
    if (!remote.ok) {
      devicesFailed.push(remoteId)
      notices.push(`sync.list.peerFailed:${remoteId}:${remote.detail ?? ""}`)
      return {
        result: {
          schema: LIST_OUTPUT_SCHEMA,
          command: "search",
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
    const name =
      status.members.find((m) => m.deviceId === remoteId)?.displayName ?? remoteId
    return {
      result: {
        schema: LIST_OUTPUT_SCHEMA,
        command: "search",
        subcommand: "-list",
        records: remoteSearchHitsToListRecords(remote.hits, {
          deviceId: remoteId,
          deviceName: name,
          remote: true
        }),
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

  const parts: ListResult[] = []
  const local = await localTaggedSearch(options, peerLine, localTag)
  parts.push(local)
  devicesQueried.push(device.deviceId)

  const connectedIds = await service.listConnectedPeerDeviceIds()
  const memberNameById = new Map<string, string>()
  for (const member of (await service.status()).members) {
    memberNameById.set(member.deviceId, member.displayName)
  }

  for (const remoteId of connectedIds) {
    devicesQueried.push(remoteId)
    const remote = await service.searchRemote(remoteId, peerLine)
    if (!remote.ok) {
      devicesFailed.push(remoteId)
      notices.push(`sync.list.peerFailed:${remoteId}:${remote.detail ?? ""}`)
      continue
    }
    const name = memberNameById.get(remoteId) ?? remoteId
    parts.push({
      schema: LIST_OUTPUT_SCHEMA,
      command: "search",
      subcommand: "-list",
      records: remoteSearchHitsToListRecords(remote.hits, {
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
    result: mergeListResults("search", "-list", parts, {
      devicesQueried: devicesQueried.join(","),
      devicesFailed: devicesFailed.join(","),
      syncNotices: notices.length > 0 ? notices.join("\n") : undefined
    }),
    meta: { devicesQueried, devicesFailed },
    notices
  }
}
