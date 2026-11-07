/** EN: Hydrate TabPickerRow[] from a tabs ListResult (cross-device browse). */

import type { ListResult } from "../../command-line/list-output/types.ts"
import type { TabPickerRow } from "../../tabs/picker-rows.ts"

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

/**
 * EN: Build picker rows from ListResult. Remote rows keep null-safe local ids;
 * operable activation must check `fields.remote` / device tags separately.
 */
export function tabPickerRowsFromListResult(listResult: ListResult): TabPickerRow[] {
  const rows: TabPickerRow[] = []
  for (const record of listResult.records) {
    if (record.kind === "tabs.window") {
      rows.push({
        kind: "window",
        windowId: numberField(record.fields.windowId, -1),
        label: stringField(record.display?.label, stringField(record.fields.title)),
        windowTitle: stringField(record.fields.title),
        usesActiveTabTitle: false,
        focused: boolField(record.fields.focused)
      })
      continue
    }
    if (record.kind === "tabs.group") {
      const groupIdRaw = record.fields.groupId
      const groupId =
        typeof groupIdRaw === "number" && Number.isFinite(groupIdRaw) ? groupIdRaw : null
      rows.push({
        kind: "group",
        windowId: numberField(record.fields.windowId, -1),
        groupId,
        label: stringField(record.display?.label, stringField(record.fields.label)),
        color: "grey"
      })
      continue
    }
    if (record.kind === "tabs.tab") {
      const groupIdRaw = record.fields.groupId
      const groupId =
        typeof groupIdRaw === "number" && Number.isFinite(groupIdRaw) ? groupIdRaw : null
      const remote = record.fields.remote === true
      // EN: Remote peer tabIds must not drive local chrome.tabs APIs (collision risk).
      const tabId = remote ? -1 : numberField(record.fields.tabId, -1)
      rows.push({
        kind: "tab",
        tabId,
        windowId: remote ? -1 : numberField(record.fields.windowId, -1),
        groupId: remote ? null : groupId,
        groupColor: null,
        title: stringField(record.display?.label, stringField(record.fields.title)),
        url: stringField(record.fields.url),
        faviconSrc: null,
        active: remote ? false : boolField(record.fields.active)
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
