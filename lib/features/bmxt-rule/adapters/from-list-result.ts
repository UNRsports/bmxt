import type { ListFieldValue, ListRecord, ListResult } from "../../command-line/list-output/types.ts"
import { BMXT_RULE_SCHEMA, type BmxtRuleRecord, type BmxtRuleScalar, type BmxtRuleStream } from "../types.ts"
import { bmxtRuleProducer, bmxtRuleRecord } from "../entries.ts"

function toScalar(value: ListFieldValue | undefined): BmxtRuleScalar | undefined {
  if (value === undefined) {
    return undefined
  }
  return value
}

function stringScalar(value: ListFieldValue | undefined, fallback = ""): string {
  if (value === null || value === undefined) {
    return fallback
  }
  return String(value)
}

function searchHitTargetKind(source: string): string {
  const normalized = source.toLowerCase()
  if (normalized.includes("bookmark")) {
    return "bookmark"
  }
  if (normalized.includes("history")) {
    return "history"
  }
  if (normalized.includes("snapshot")) {
    return "markdown.file"
  }
  if (normalized.includes("page") || normalized.includes("tab")) {
    return "page.open"
  }
  return "search.hit"
}

function listRecordToBmxtRuleRecord(record: ListRecord): BmxtRuleRecord {
  switch (record.kind) {
    case "tabs.tab":
      return bmxtRuleRecord("page.open", {
        url: stringScalar(record.fields.url),
        pageTitle: stringScalar(record.fields.title),
        tabId: toScalar(record.fields.tabId) ?? null,
        windowId: toScalar(record.fields.windowId) ?? null,
        groupId: toScalar(record.fields.groupId) ?? null,
        active: toScalar(record.fields.active) ?? false
      })
    case "tabs.window":
      return bmxtRuleRecord("page.window", {
        pageTitle: stringScalar(record.fields.title),
        windowId: toScalar(record.fields.windowId) ?? null,
        focused: toScalar(record.fields.focused) ?? false,
        url: ""
      })
    case "tabs.group":
      return bmxtRuleRecord("page.group", {
        pageTitle: stringScalar(record.fields.label),
        label: stringScalar(record.fields.label),
        windowId: toScalar(record.fields.windowId) ?? null,
        groupId: toScalar(record.fields.groupId) ?? null,
        url: ""
      })
    case "search.hit": {
      const source = stringScalar(record.fields.source, "search")
      const kind = searchHitTargetKind(source)
      const fields: Record<string, BmxtRuleScalar> = {
        url: stringScalar(record.fields.url),
        pageTitle: stringScalar(record.fields.title),
        index: toScalar(record.fields.index) ?? null,
        source,
        tabId: toScalar(record.fields.tabId) ?? null,
        hitCount: toScalar(record.fields.hitCount) ?? 0,
        pattern: stringScalar(record.fields.pattern)
      }
      return bmxtRuleRecord(kind, fields)
    }
    case "dom.node":
      return bmxtRuleRecord("dom.node", {
        pageTitle: stringScalar(record.display?.label ?? record.fields.line),
        index: toScalar(record.fields.index) ?? null,
        path: stringScalar(record.fields.path),
        line: stringScalar(record.fields.line)
      })
    case "dom.notice":
      return bmxtRuleRecord("dom.notice", {
        pageTitle: stringScalar(record.display?.label),
        notice: stringScalar(record.fields.notice)
      })
    case "session.row":
      return bmxtRuleRecord("session.row", {
        pageTitle: stringScalar(record.fields.displayName),
        index: toScalar(record.fields.index) ?? null,
        sessionId: stringScalar(record.fields.sessionId),
        active: toScalar(record.fields.active) ?? false,
        name: stringScalar(record.fields.displayName)
      })
    case "setting.field":
      return bmxtRuleRecord("setting.field", {
        pageTitle: stringScalar(record.display?.label ?? record.fields.key),
        key: stringScalar(record.fields.key),
        value: stringScalar(record.fields.value)
      })
    default: {
      const fields: Record<string, BmxtRuleScalar> = {}
      for (const [key, value] of Object.entries(record.fields)) {
        const scalar = toScalar(value)
        if (scalar !== undefined) {
          fields[key] = scalar
        }
      }
      return bmxtRuleRecord(record.kind, fields)
    }
  }
}

/** EN: Convert legacy `ListResult` (`bmxt-list/1`) into a bmxtRule stream. */
export function bmxtRuleStreamFromListResult(listResult: ListResult): BmxtRuleStream {
  const producerFields: Record<string, BmxtRuleScalar> = {
    command: listResult.command,
    subcommand: listResult.subcommand
  }
  if (listResult.meta?.sourceTabId !== undefined) {
    producerFields.sourceTabId = listResult.meta.sourceTabId
  }
  if (listResult.meta?.truncatedCapture === true) {
    producerFields.truncatedCapture = true
  }
  return {
    schema: BMXT_RULE_SCHEMA,
    producer: bmxtRuleProducer(producerFields),
    records: listResult.records.map(listRecordToBmxtRuleRecord)
  }
}
