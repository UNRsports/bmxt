export function PickerSearchFooter({ filterQuery }: { filterQuery: string }) {
  return (
    <div className="bmxt-tab-picker-filter">
      <span className="bmxt-tab-picker-filter-label">/</span>
      <span className="bmxt-tab-picker-filter-query">{filterQuery || " "}</span>
      <span className="bmxt-tab-picker-filter-hint">
        Enter で / 終了（ハイライト維持）· Esc キャンセル
      </span>
    </div>
  )
}

export const TabPickerSearchFooter = PickerSearchFooter
