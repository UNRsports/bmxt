import type { UiLocale } from "../setting/locale.ts"
import { tTabs } from "../setting/i18n/ns/tabs.ts"
import type { TabPickerRow } from "./picker-rows.ts"
import { plainLabelPartsForTabPickerRow } from "./tabs-list-label-parts.ts"

function localizedGroupId(groupId: string, locale: UiLocale): string {
  if (groupId === "none") {
    return tTabs("tabs.list.plain.groupIdNone", locale)
  }
  return groupId
}

export function plainLabelForTabPickerRow(row: TabPickerRow, locale: UiLocale): {
  indent: number
  label: string
  detail?: string
} {
  const parts = plainLabelPartsForTabPickerRow(row)
  if (parts.key === "tabs.list.plain.group") {
    return {
      indent: 1,
      label: tTabs(parts.key, locale, {
        groupId: localizedGroupId(parts.vars.groupId, locale),
        label: parts.vars.label
      })
    }
  }
  if (parts.key === "tabs.list.plain.tab" || parts.key === "tabs.list.plain.tabActive") {
    return {
      indent: 2,
      label: tTabs(parts.key, locale, parts.vars),
      detail:
        parts.url !== undefined
          ? tTabs("tabs.list.plain.urlDetail", locale, { url: parts.url })
          : undefined
    }
  }
  return {
    indent: 0,
    label: tTabs(parts.key, locale, parts.vars)
  }
}
