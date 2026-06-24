import { tTabs } from "../setting/i18n/ns/tabs"
import type { UiLocale } from "../setting/locale"
import { displayTitle, type TabPickerRow } from "./picker-rows"
import { resolveLiveTabTitle } from "./tab-picker-live-tab-fields"

type WindowPickerRow = Extract<TabPickerRow, { kind: "window" }>

/** EN: Window header text; active-tab titles come from the live fields store. */
export function formatWindowPickerLabel(
  row: WindowPickerRow,
  rows: TabPickerRow[],
  trackedWindowId: number | undefined,
  trackedWindowTitle: string | null,
  locale: UiLocale
): string {
  const starred = trackedWindowId !== undefined && row.windowId === trackedWindowId
  const star = starred ? "*" : " "
  let title = row.windowTitle
  if (row.usesActiveTabTitle) {
    if (starred && trackedWindowTitle !== null) {
      title = trackedWindowTitle
    } else {
      const activeTab = rows.find(
        (r) => r.kind === "tab" && r.windowId === row.windowId && r.active
      )
      if (activeTab?.kind === "tab") {
        title = displayTitle(resolveLiveTabTitle(activeTab.tabId, activeTab.title))
      }
    }
  }
  return tTabs("tabs.picker.windowLabel", locale, { star, title })
}

export { displayTitle }
