import type { ReactNode } from "react"
import { tSearch } from "../setting/i18n/ns/search"
import { useUiSettings } from "../setting/use-ui-settings"
import type { SearchListPickerView } from "./search-list-picker-body"

type SearchPickerBreadcrumbProps = {
  view: SearchListPickerView
  /** EN: Destination was shown from detail (`Results → Detail → Open target`). */
  showDetailBeforeDestination?: boolean
}

/** EN: Locale-aware breadcrumb above the search picker list. */
export function SearchPickerBreadcrumb({
  view,
  showDetailBeforeDestination = false
}: SearchPickerBreadcrumbProps): ReactNode {
  const { settings: uiSettings } = useUiSettings()
  const onResults = view === "results"
  const onDetail = view === "detail"
  const onDestination = view === "destination"
  const locale = uiSettings.locale
  return (
    <div
      className="bmxt-search-picker-crumb"
      aria-label={tSearch("search.picker.breadcrumb.aria", locale)}>
      <span
        className={
          onResults
            ? "bmxt-search-picker-crumb-segment bmxt-search-picker-crumb-segment--active"
            : "bmxt-search-picker-crumb-segment"
        }>
        {tSearch("search.picker.breadcrumb.results", locale)}
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
            {tSearch("search.picker.breadcrumb.detail", locale)}
          </span>
        </>
      ) : null}
      {onDestination ? (
        <>
          <span className="bmxt-search-picker-crumb-sep" aria-hidden="true">
            &gt;
          </span>
          <span className="bmxt-search-picker-crumb-segment bmxt-search-picker-crumb-segment--active">
            {tSearch("search.picker.breadcrumb.destination", locale)}
          </span>
        </>
      ) : null}
    </div>
  )
}
