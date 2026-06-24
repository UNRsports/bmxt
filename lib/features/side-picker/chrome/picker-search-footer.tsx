import { tPicker } from "../../setting/i18n/ns/picker"
import { useUiSettings } from "../../setting/use-ui-settings"

export function PickerSearchFooter({ filterQuery }: { filterQuery: string }) {
  const { settings: uiSettings } = useUiSettings()
  const locale = uiSettings.locale
  return (
    <div className="bmxt-tab-picker-filter">
      <span className="bmxt-tab-picker-filter-label">/</span>
      <span className="bmxt-tab-picker-filter-query">{filterQuery || " "}</span>
      <span className="bmxt-tab-picker-filter-hint">{tPicker("picker.searchFooter.hint", locale)}</span>
    </div>
  )
}

export const TabPickerSearchFooter = PickerSearchFooter
