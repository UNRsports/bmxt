/**
 * EN: Build list match objects from structured WASM IR fields (no line re-parse).
 * JA: WASM の構造化フィールドから list match を組み立てる（行の再パースなし）。
 */

import { parseBookmarkListLine } from "../../bookmark/bookmark-list-parse.ts"
import { parseHistoryListLine } from "../../history/history-list-parse.ts"
import type { DeviceListScope } from "../../sync/bus/device-list-scope.ts"
import type { ListCommandId } from "./types.ts"

export type ListPlan = {
  listId: ListCommandId
  match: unknown
  showUrl: boolean
}

/** EN: Bare `--device` (no id) — host must refuse or Interactive-pick; never treat as local. */
export function isBareDeviceScope(deviceScope: string, deviceId: string): boolean {
  return deviceScope === "device" && deviceId.trim().length === 0
}

function scopeFromIr(deviceScope: string, deviceId: string): DeviceListScope {
  if (deviceScope === "peers") {
    return { kind: "peers" }
  }
  if (deviceScope === "device") {
    const id = deviceId.trim()
    if (id.length > 0) {
      return { kind: "device", deviceId: id }
    }
    // EN: Placeholder; callers must refuse via `isBareDeviceScope` before fetch.
    return { kind: "device", deviceId: "" }
  }
  return { kind: "local" }
}

/** EN: Tabs / session / setting / bookmark / history open_plain_list → ListPlan. */
export function listPlanFromOpenPlainList(action: {
  list_id: string
  line: string
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
  if (listId === "bookmark") {
    const line =
      action.line.trim().length > 0 ? action.line.trim() : "bookmark -list"
    const parsed = parseBookmarkListLine(line)
    if (parsed !== null) {
      return {
        listId: "bookmark",
        showUrl: false,
        match: { folderId: parsed.folderId, scope: parsed.scope }
      }
    }
    return {
      listId: "bookmark",
      showUrl: false,
      match: {
        folderId: null as string | null,
        scope: scopeFromIr(action.device_scope, action.device_id)
      }
    }
  }
  if (listId === "history") {
    const line = action.line.trim().length > 0 ? action.line.trim() : "history -list"
    const parsed = parseHistoryListLine(line)
    if (parsed !== null) {
      return {
        listId: "history",
        showUrl: false,
        match: { pattern: parsed.pattern, scope: parsed.scope }
      }
    }
    return {
      listId: "history",
      showUrl: false,
      match: {
        pattern: "",
        scope: scopeFromIr(action.device_scope, action.device_id)
      }
    }
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
