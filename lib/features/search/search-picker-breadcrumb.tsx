import type { ReactNode } from "react"

type SearchPickerBreadcrumbProps = {
  view: "results" | "detail"
}

/** EN: JA/EN breadcrumb above the search picker list. */
export function SearchPickerBreadcrumb({ view }: SearchPickerBreadcrumbProps): ReactNode {
  const onResults = view === "results"
  const onDetail = view === "detail"
  return (
    <div className="bmxt-search-picker-crumb" aria-label="Search picker navigation">
      <span
        className={
          onResults ? "bmxt-search-picker-crumb-segment bmxt-search-picker-crumb-segment--active" : "bmxt-search-picker-crumb-segment"
        }>
        検索結果一覧 · Search Results
      </span>
      {onDetail ? (
        <>
          <span className="bmxt-search-picker-crumb-sep" aria-hidden="true">
            &gt;
          </span>
          <span className="bmxt-search-picker-crumb-segment bmxt-search-picker-crumb-segment--active">
            詳細一覧 · Detail List
          </span>
        </>
      ) : null}
    </div>
  )
}
