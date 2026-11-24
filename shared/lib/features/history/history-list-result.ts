/** EN: History picker rows ↔ ListResult (bmxt-list/1). */

import type { ListRecord, ListResult } from "../command-line/list-output/types.ts"
import { LIST_OUTPUT_SCHEMA } from "../command-line/list-output/types.ts"
import type { HistoryPickerRow } from "./picker-rows.ts"

/**
 * EN: Same-object handoff for `history -list | browse` — skip serialize→deserialize of 10k rows.
 * JA: 同一 ListResult 参照なら再構築を避け、browse 開時の往復コストを省く。
 */
const rowsByListResult = new WeakMap<ListResult, readonly HistoryPickerRow[]>()

export function historyPickerRowsToListResult(rows: readonly HistoryPickerRow[]): ListResult {
  const records: ListRecord[] = []
  for (const row of rows) {
    if (row.kind === "month") {
      records.push({
        kind: "history.month",
        fields: {
          monthKey: row.monthKey,
          title: row.label
        },
        display: {
          indent: 0,
          label: row.label,
          detail: row.monthKey
        }
      })
      continue
    }
    if (row.kind === "day") {
      records.push({
        kind: "history.day",
        fields: {
          dayKey: row.dayKey,
          monthKey: row.monthKey,
          title: row.label
        },
        display: {
          indent: 1,
          label: row.label,
          detail: row.dayKey
        }
      })
      continue
    }
    records.push({
      kind: "history.visit",
      fields: {
        url: row.url,
        title: row.title,
        pageTitle: row.title,
        lastVisitTime: row.lastVisitTime,
        visitCount: row.visitCount,
        dayKey: row.dayKey,
        monthKey: row.monthKey
      },
      display: {
        indent: 2,
        label: row.title,
        detail: row.url
      },
      pipeLine: [
        "history.visit",
        `url=${JSON.stringify(row.url)}`,
        `title=${JSON.stringify(row.title)}`,
        `lastVisitTime=${row.lastVisitTime}`,
        `visitCount=${row.visitCount}`
      ].join("\t")
    })
  }
  const listResult: ListResult = {
    schema: LIST_OUTPUT_SCHEMA,
    command: "history",
    subcommand: "-list",
    records
  }
  rowsByListResult.set(listResult, rows)
  return listResult
}

export function historyPickerRowsFromListResult(listResult: ListResult): HistoryPickerRow[] {
  const cached = rowsByListResult.get(listResult)
  if (cached !== undefined) {
    return cached.slice()
  }
  const rows: HistoryPickerRow[] = []
  for (const record of listResult.records) {
    if (record.kind === "history.month") {
      const monthKey =
        typeof record.fields.monthKey === "string" ? record.fields.monthKey : ""
      if (monthKey.length === 0) {
        continue
      }
      const label =
        typeof record.fields.title === "string" && record.fields.title.length > 0
          ? record.fields.title
          : (record.display?.label ?? monthKey)
      rows.push({ kind: "month", monthKey, label })
      continue
    }
    if (record.kind === "history.day") {
      const dayKey = typeof record.fields.dayKey === "string" ? record.fields.dayKey : ""
      const monthKey =
        typeof record.fields.monthKey === "string" ? record.fields.monthKey : ""
      if (dayKey.length === 0 || monthKey.length === 0) {
        continue
      }
      const label =
        typeof record.fields.title === "string" && record.fields.title.length > 0
          ? record.fields.title
          : (record.display?.label ?? dayKey)
      rows.push({ kind: "day", dayKey, monthKey, label })
      continue
    }
    if (record.kind === "history.visit") {
      const url = typeof record.fields.url === "string" ? record.fields.url : ""
      if (url.length === 0) {
        continue
      }
      const title =
        typeof record.fields.title === "string" && record.fields.title.length > 0
          ? record.fields.title
          : typeof record.fields.pageTitle === "string" && record.fields.pageTitle.length > 0
            ? record.fields.pageTitle
            : url
      const lastVisitTime =
        typeof record.fields.lastVisitTime === "number" &&
        Number.isFinite(record.fields.lastVisitTime)
          ? record.fields.lastVisitTime
          : 0
      const visitCount =
        typeof record.fields.visitCount === "number" && Number.isFinite(record.fields.visitCount)
          ? record.fields.visitCount
          : 0
      const dayKey =
        typeof record.fields.dayKey === "string" && record.fields.dayKey.length > 0
          ? record.fields.dayKey
          : historyDayKeyFallback(lastVisitTime)
      const monthKey =
        typeof record.fields.monthKey === "string" && record.fields.monthKey.length > 0
          ? record.fields.monthKey
          : dayKey.slice(0, 7)
      rows.push({
        kind: "visit",
        url,
        title,
        lastVisitTime,
        visitCount,
        dayKey,
        monthKey
      })
    }
  }
  return rows
}

function historyDayKeyFallback(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) {
    return "1970-01-01"
  }
  const d = new Date(ms)
  const pad = (n: number) => (n < 10 ? `0${n}` : String(n))
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
