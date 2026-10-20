import { tPicker } from "../../setting/i18n/ns/picker"
import { useUiSettings } from "../../setting/use-ui-settings"

export function PickerCommandFooter({
  commandBuffer,
  showListingHint,
  listingHintText,
  ambiguousPlaceholder
}: {
  commandBuffer: string
  showListingHint: boolean
  listingHintText: string
  /** 補完候補が 2 件以上のときのプレースホルダ行（Tab 循環の案内） */
  ambiguousPlaceholder: string | null
}) {
  const { settings: uiSettings } = useUiSettings()
  const locale = uiSettings.locale
  const empty = commandBuffer.trim() === ""
  return (
    <div className="bmxt-tab-picker-filter bmxt-tab-picker-filter--command-col">
      <div className="bmxt-tab-picker-filter-row">
        <span className="bmxt-tab-picker-filter-label">:</span>
        <span className="bmxt-tab-picker-filter-query">
          {empty && showListingHint ? (
            <span className="bmxt-tab-picker-command-listing-hint">{listingHintText}</span>
          ) : (
            commandBuffer || " "
          )}
        </span>
        <span className="bmxt-tab-picker-filter-hint">{tPicker("picker.commandFooter.hint", locale)}</span>
      </div>
      {ambiguousPlaceholder ? (
        <div className="bmxt-tab-picker-command-ambiguous-placeholder" aria-live="polite">
          {ambiguousPlaceholder}
        </div>
      ) : null}
    </div>
  )
}

export const TabPickerCommandFooter = PickerCommandFooter
