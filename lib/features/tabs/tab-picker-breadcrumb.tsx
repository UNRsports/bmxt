import type { ReactNode } from "react"
import { useUiCopy } from "../setting"
import type { TabPickerListView } from "./tab-picker-actions"

type TabPickerBreadcrumbProps = {
  view: TabPickerListView
}

/** EN: Locale-aware breadcrumb above the tab picker list (list → actions). */
export function TabPickerBreadcrumb({ view }: TabPickerBreadcrumbProps): ReactNode {
  const uiCopy = useUiCopy()
  const onList = view === "list"
  const onActions = view === "actions"
  return (
    <div className="bmxt-search-picker-crumb" aria-label="Tab picker navigation">
      <span
        className={
          onList
            ? "bmxt-search-picker-crumb-segment bmxt-search-picker-crumb-segment--active"
            : "bmxt-search-picker-crumb-segment"
        }>
        {uiCopy.t("tabs.picker.breadcrumb.list")}
      </span>
      {onActions ? (
        <>
          <span className="bmxt-search-picker-crumb-sep" aria-hidden="true">
            &gt;
          </span>
          <span className="bmxt-search-picker-crumb-segment bmxt-search-picker-crumb-segment--active">
            {uiCopy.t("tabs.picker.breadcrumb.actions")}
          </span>
        </>
      ) : null}
    </div>
  )
}
