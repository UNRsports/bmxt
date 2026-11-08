import type { ListRecord, ListResult } from "../../command-line/list-output/types.ts"
import { LIST_OUTPUT_SCHEMA } from "../../command-line/list-output/types.ts"
import type { SyncRemoteSearchHit, SyncRemoteTabRow } from "../types.ts"

export type DeviceTag = {
  deviceId: string
  deviceName: string
  /** EN: When true, numeric tabId must not drive local page.open consumers. */
  remote: boolean
}

function withDevicePrefix(label: string, tag: DeviceTag): string {
  const name = tag.deviceName.trim().length > 0 ? tag.deviceName.trim() : tag.deviceId
  return `[${name}] ${label}`
}

export function tagListRecords(
  records: readonly ListRecord[],
  tag: DeviceTag
): ListRecord[] {
  return records.map((record) => {
    const fields: ListRecord["fields"] = {
      ...record.fields,
      deviceId: tag.deviceId,
      deviceName: tag.deviceName,
      remote: tag.remote
    }
    if (tag.remote && "tabId" in fields) {
      // EN: Keep peer-local id for display only under remoteTabId; clear operable tabId.
      if (typeof fields.tabId === "number") {
        fields.remoteTabId = fields.tabId
      }
      fields.tabId = null
    }
    const display =
      record.display === undefined
        ? undefined
        : {
            ...record.display,
            label: withDevicePrefix(record.display.label, tag)
          }
    return {
      ...record,
      fields,
      display
    }
  })
}

export function remoteTabRowsToListRecords(
  rows: readonly SyncRemoteTabRow[],
  tag: DeviceTag
): ListRecord[] {
  const records: ListRecord[] = []
  for (const row of rows) {
    if (row.kind === "window") {
      records.push({
        kind: "tabs.window",
        fields: {
          windowId: row.windowId,
          title: row.title,
          focused: row.focused
        },
        display: {
          indent: 0,
          label: row.title
        }
      })
      continue
    }
    if (row.kind === "group") {
      records.push({
        kind: "tabs.group",
        fields: {
          windowId: row.windowId,
          groupId: row.groupId,
          label: row.label
        },
        display: {
          indent: 1,
          label: row.label
        }
      })
      continue
    }
    const tabFields: ListRecord["fields"] = {
      tabId: row.tabId,
      windowId: row.windowId,
      groupId: row.groupId,
      title: row.title,
      url: row.url,
      active: row.active
    }
    // EN: Optional portable https favicon — omit when absent (older peers / stripped wire).
    // JA: 任意の可搬 https favicon。無ければ省略（旧 peer / ワイヤ整形で落ちた場合）。
    if (typeof row.favIconUrl === "string" && row.favIconUrl.length > 0) {
      tabFields.favIconUrl = row.favIconUrl
    }
    records.push({
      kind: "tabs.tab",
      fields: tabFields,
      display: {
        indent: 2,
        label: row.title,
        detail: row.url
      },
      pipeLine: [
        "tabs.tab",
        `tabId=${row.tabId}`,
        `windowId=${row.windowId}`,
        `groupId=${row.groupId ?? ""}`,
        `active=${row.active ? "true" : "false"}`,
        `title=${JSON.stringify(row.title)}`,
        `url=${JSON.stringify(row.url)}`
      ].join("\t")
    })
  }
  return tagListRecords(records, tag)
}

export function remoteSearchHitsToListRecords(
  hits: readonly SyncRemoteSearchHit[],
  tag: DeviceTag
): ListRecord[] {
  const records: ListRecord[] = hits.map((hit) => {
    const fields: ListRecord["fields"] = {
      index: hit.index,
      source: hit.source,
      title: hit.title,
      url: hit.url,
      tabId: hit.tabId,
      hitCount: hit.hitCount,
      pattern: hit.pattern
    }
    if (hit.windowId !== null) {
      fields.windowId = hit.windowId
    }
    return {
      kind: "search.hit" as const,
      fields,
      display: {
        label: hit.title.length > 0 ? hit.title : hit.url
      }
    }
  })
  return tagListRecords(records, tag)
}

export function mergeListResults(
  command: string,
  subcommand: string,
  parts: readonly ListResult[],
  meta?: ListResult["meta"]
): ListResult {
  const records: ListRecord[] = []
  for (const part of parts) {
    for (const record of part.records) {
      records.push(record)
    }
  }
  return {
    schema: LIST_OUTPUT_SCHEMA,
    command,
    subcommand,
    records,
    meta
  }
}
