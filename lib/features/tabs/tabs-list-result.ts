import type { UiLocale } from "../setting/locale.ts"
import type { TabPickerRow } from "./picker-rows.ts"
import type { ListRecord, ListResult } from "../command-line/list-output/types.ts"
import { LIST_OUTPUT_SCHEMA } from "../command-line/list-output/types.ts"
import { plainLabelForTabPickerRow } from "./tabs-list-plain-labels.ts"

function groupIdField(groupId: number | null): number | null {
  return groupId
}

export function tabPickerRowsToListResult(
  rows: readonly TabPickerRow[],
  locale: UiLocale
): ListResult {
  const records: ListRecord[] = []
  for (const row of rows) {
    const display = plainLabelForTabPickerRow(row, locale)
    if (row.kind === "window") {
      records.push({
        kind: "tabs.window",
        fields: {
          windowId: row.windowId,
          title: row.windowTitle,
          focused: row.focused
        },
        display
      })
      continue
    }
    if (row.kind === "group") {
      records.push({
        kind: "tabs.group",
        fields: {
          windowId: row.windowId,
          groupId: groupIdField(row.groupId),
          label: row.label
        },
        display
      })
      continue
    }
    records.push({
      kind: "tabs.tab",
      fields: {
        tabId: row.tabId,
        windowId: row.windowId,
        groupId: groupIdField(row.groupId),
        title: row.title,
        url: row.url,
        active: row.active
      },
      display,
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
  return {
    schema: LIST_OUTPUT_SCHEMA,
    command: "tab",
    subcommand: "-list",
    records
  }
}
