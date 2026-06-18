import { useUiCopy } from "../../setting"

export function PickerSearchFooter({ filterQuery }: { filterQuery: string }) {
  const uiCopy = useUiCopy()
  return (
    <div className="bmxt-tab-picker-filter">
      <span className="bmxt-tab-picker-filter-label">/</span>
      <span className="bmxt-tab-picker-filter-query">{filterQuery || " "}</span>
      <span className="bmxt-tab-picker-filter-hint">{uiCopy.t("picker.searchFooter.hint")}</span>
    </div>
  )
}

export const TabPickerSearchFooter = PickerSearchFooter
