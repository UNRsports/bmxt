import type { ReactNode } from "react"
import type { SearchListPickerView } from "./search-list-picker-body"

type SearchPickerBreadcrumbProps = {
  view: SearchListPickerView
  /** EN: Destination was opened from detail (`Results → Detail → Open target`). */
  showDetailBeforeDestination?: boolean
}

/** EN: JA/EN breadcrumb above the search picker list. */
export function SearchPickerBreadcrumb({
  view,
  showDetailBeforeDestination = false
}: SearchPickerBreadcrumbProps): ReactNode {
  const onResults = view === "results"
  const onDetail = view === "detail"
  const onDestination = view === "destination"
  return (
    <div className="bmxt-search-picker-crumb" aria-label="Search picker navigation">
      <span
        className={
          onResults
            ? "bmxt-search-picker-crumb-segment bmxt-search-picker-crumb-segment--active"
            : "bmxt-search-picker-crumb-segment"
        }>
        検索結果一覧 · Search Results
      </span>
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
            詳細一覧 · Detail List
          </span>
        </>
      ) : null}
      {onDestination ? (
        <>
          <span className="bmxt-search-picker-crumb-sep" aria-hidden="true">
            &gt;
          </span>
          <span className="bmxt-search-picker-crumb-segment bmxt-search-picker-crumb-segment--active">
            開き先 · Open target
          </span>
        </>
      ) : null}
    </div>
  )
}
