import type { ReactNode } from "react"
import { useUiCopy } from "../setting"
import type { SearchPickerListView } from "./search-picker-actions"

type SearchPickerBreadcrumbProps = {
  view: SearchPickerListView
  /** EN: Destination was shown from detail (`Results → Detail → Open target`). */
  showDetailBeforeDestination?: boolean
}

/** EN: Locale-aware breadcrumb above the search picker list. */
export function SearchPickerBreadcrumb({
  view,
  showDetailBeforeDestination = false
}: SearchPickerBreadcrumbProps): ReactNode {
  const uiCopy = useUiCopy()
  const onResults = view === "results"
  const onActions = view === "actions"
  const onDetail = view === "detail"
  const onDestination = view === "destination"
  return (
    <div className="bmxt-search-picker-crumb" aria-label="Search picker navigation">
      <span
        className={
          onResults || onActions
            ? "bmxt-search-picker-crumb-segment bmxt-search-picker-crumb-segment--active"
            : "bmxt-search-picker-crumb-segment"
        }>
        {uiCopy.t("search.picker.breadcrumb.results")}
      </span>
      {onActions ? (
        <>
          <span className="bmxt-search-picker-crumb-sep" aria-hidden="true">
            &gt;
          </span>
          <span className="bmxt-search-picker-crumb-segment bmxt-search-picker-crumb-segment--active">
            {uiCopy.t("search.picker.breadcrumb.actions")}
          </span>
        </>
      ) : null}
      {onDetail || (onDestination && showDetailBeforeDestination) ? (
        <>
          <span className="bmxt-search-picker-crumb-sep" aria-hidden="true">
            &gt;
          </span>
          <span
            className={
              onDetail
                ? "bmxt-search-picker-crumb-segment bmxt-search-picker-crumb-segment--active"
                : "bmxt-search-picker-crumb-segment"
            }>
            {uiCopy.t("search.picker.breadcrumb.detail")}
          </span>
        </>
      ) : null}
      {onDestination ? (
        <>
          <span className="bmxt-search-picker-crumb-sep" aria-hidden="true">
            &gt;
          </span>
          <span className="bmxt-search-picker-crumb-segment bmxt-search-picker-crumb-segment--active">
            {uiCopy.t("search.picker.breadcrumb.destination")}
          </span>
        </>
      ) : null}
    </div>
  )
}
