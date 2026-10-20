import type { TabPickerRow } from "./picker-rows.ts"

export type TabsListPlainLabelParts =
  | {
      key: "tabs.list.plain.window" | "tabs.list.plain.windowFocused"
      vars: { windowId: string; title: string }
    }
  | {
      key: "tabs.list.plain.group"
      vars: { groupId: string; label: string }
    }
  | {
      key: "tabs.list.plain.tab" | "tabs.list.plain.tabActive"
      vars: { tabId: string; title: string }
      url?: string
    }

function groupIdToken(groupId: number | null): string {
  if (groupId === null) {
    return "none"
  }
  return String(groupId)
}

/** EN: Resolve i18n key + vars for one picker row (locale applied separately). */
export function plainLabelPartsForTabPickerRow(row: TabPickerRow): TabsListPlainLabelParts {
  if (row.kind === "window") {
    const key = row.focused ? "tabs.list.plain.windowFocused" : "tabs.list.plain.window"
    return {
      key,
      vars: {
        windowId: String(row.windowId),
        title: row.windowTitle
      }
    }
  }
  if (row.kind === "group") {
    return {
      key: "tabs.list.plain.group",
      vars: {
        groupId: groupIdToken(row.groupId),
        label: row.label
      }
    }
  }
  const key = row.active ? "tabs.list.plain.tabActive" : "tabs.list.plain.tab"
  return {
    key,
    vars: {
      tabId: String(row.tabId),
      title: row.title
    },
    url: row.url.length > 0 ? row.url : undefined
  }
}
