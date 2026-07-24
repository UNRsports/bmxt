import type { TabPickerRow } from "./picker-rows.ts"
import { bmxtRuleRecord, type BmxtRuleRecord } from "../bmxt-rule/index.ts"

/** EN: Map one open tab row to a `page.open` bmxtRule record. */
export function pageOpenRecordFromTabRow(row: Extract<TabPickerRow, { kind: "tab" }>): BmxtRuleRecord {
  return bmxtRuleRecord("page.open", {
    url: row.url,
    pageTitle: row.title,
    tabId: row.tabId,
    windowId: row.windowId,
    groupId: row.groupId,
    active: row.active
  })
}
