/**
 * EN: Build list match objects from structured WASM IR fields (no line re-parse).
 * JA: WASM の構造化フィールドから list match を組み立てる（行の再パースなし）。
 */

import type { DeviceListScope } from "../../sync/bus/device-list-scope.ts"
import type { ListCommandId } from "./types.ts"

export type ListPlan = {
  listId: ListCommandId
  match: unknown
  showUrl: boolean
}

function scopeFromIr(deviceScope: string, deviceId: string): DeviceListScope {
  if (deviceScope === "peers") {
    return { kind: "peers" }
  }
  if (deviceScope === "device" && deviceId.trim().length > 0) {
    return { kind: "device", deviceId: deviceId.trim() }
  }
  return { kind: "local" }
}

/** EN: Tabs / session / setting open_plain_list → ListPlan. */
export function listPlanFromOpenPlainList(action: {
  list_id: string
  show_url: string
  device_scope: string
  device_id: string
}): ListPlan | null {
  const listId = action.list_id.trim()
  if (listId === "tabs") {
    return {
      listId: "tabs",
      showUrl: action.show_url === "true",
      match: {
        showUrl: action.show_url === "true",
        scope: scopeFromIr(action.device_scope, action.device_id)
      }
    }
  }
  if (listId === "session") {
    return { listId: "session", showUrl: false, match: {} }
  }
  if (listId === "setting") {
    return { listId: "setting", showUrl: false, match: {} }
  }
  return null
}

/** EN: search_list effect → ListPlan. */
export function listPlanFromSearchListEffect(effect: {
  dispatch_line: string
  peer_dispatch_line: string
  device_scope: string
  device_id: string
}): ListPlan {
  return {
    listId: "search",
    showUrl: false,
    match: {
      dispatchLine: effect.dispatch_line,
      peerDispatchLine: effect.peer_dispatch_line,
      scope: scopeFromIr(effect.device_scope, effect.device_id)
    }
  }
}
