import type { ListFieldValue, ListRecord, ListResult } from "../../command-line/list-output/types.ts"
import {
  bmxtRuleKindForSearchHitSource,
  LIST_KIND_TO_BMXT_RULE_KIND
} from "../../command-line/inter-command/vocabulary.ts"
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

function isRemoteRecord(record: ListRecord): boolean {
  return record.fields.remote === true
}

function operableTabId(record: ListRecord): BmxtRuleScalar | null {
  if (isRemoteRecord(record)) {
    return null
  }
  return toScalar(record.fields.tabId) ?? null
}

function deviceFields(record: ListRecord): Record<string, BmxtRuleScalar> {
  const out: Record<string, BmxtRuleScalar> = {}
  const deviceId = record.fields.deviceId
  if (typeof deviceId === "string" && deviceId.length > 0) {
    out.deviceId = deviceId
  }
  const deviceName = record.fields.deviceName
  if (typeof deviceName === "string" && deviceName.length > 0) {
    out.deviceName = deviceName
  }
  if (isRemoteRecord(record)) {
    out.remote = true
  }
  return out
}

function listRecordToBmxtRuleRecord(record: ListRecord): BmxtRuleRecord {
  switch (record.kind) {
    case "tabs.tab":
      return bmxtRuleRecord(LIST_KIND_TO_BMXT_RULE_KIND["tabs.tab"], {
        url: stringScalar(record.fields.url),
        pageTitle: stringScalar(record.fields.title),
        tabId: operableTabId(record),
        windowId: toScalar(record.fields.windowId) ?? null,
        groupId: toScalar(record.fields.groupId) ?? null,
        active: toScalar(record.fields.active) ?? false,
        ...deviceFields(record)
      })
    case "tabs.window":
      return bmxtRuleRecord(LIST_KIND_TO_BMXT_RULE_KIND["tabs.window"], {
        pageTitle: stringScalar(record.fields.title),
        windowId: toScalar(record.fields.windowId) ?? null,
        focused: toScalar(record.fields.focused) ?? false,
        url: "",
        ...deviceFields(record)
      })
    case "tabs.group":
      return bmxtRuleRecord(LIST_KIND_TO_BMXT_RULE_KIND["tabs.group"], {
        pageTitle: stringScalar(record.fields.label),
        label: stringScalar(record.fields.label),
        windowId: toScalar(record.fields.windowId) ?? null,
        groupId: toScalar(record.fields.groupId) ?? null,
        url: "",
        ...deviceFields(record)
      })
    case "search.hit": {
      const source = stringScalar(record.fields.source, "search")
      const kind = bmxtRuleKindForSearchHitSource(source)
      const fields: Record<string, BmxtRuleScalar> = {
        url: stringScalar(record.fields.url),
        pageTitle: stringScalar(record.fields.title),
        index: toScalar(record.fields.index) ?? null,
        source,
        tabId: operableTabId(record),
        hitCount: toScalar(record.fields.hitCount) ?? 0,
        pattern: stringScalar(record.fields.pattern),
        ...deviceFields(record)
      }
      return bmxtRuleRecord(kind, fields)
    }
    case "dom.node":
      return bmxtRuleRecord(LIST_KIND_TO_BMXT_RULE_KIND["dom.node"], {
        pageTitle: stringScalar(record.display?.label ?? record.fields.line),
        index: toScalar(record.fields.index) ?? null,
        path: stringScalar(record.fields.path),
        line: stringScalar(record.fields.line)
      })
    case "dom.notice":
      return bmxtRuleRecord(LIST_KIND_TO_BMXT_RULE_KIND["dom.notice"], {
        pageTitle: stringScalar(record.display?.label),
        notice: stringScalar(record.fields.notice)
      })
    case "session.row":
      return bmxtRuleRecord(LIST_KIND_TO_BMXT_RULE_KIND["session.row"], {
        pageTitle: stringScalar(record.fields.displayName),
        index: toScalar(record.fields.index) ?? null,
        sessionId: stringScalar(record.fields.sessionId),
        active: toScalar(record.fields.active) ?? false,
        name: stringScalar(record.fields.displayName)
      })
    case "setting.field":
      return bmxtRuleRecord(LIST_KIND_TO_BMXT_RULE_KIND["setting.field"], {
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
