import type { ChromeEffect } from "../../dispatch/effect-types"
import type { PickerEntry } from "./picker-entry"
import { normalizePickerOpenUrl } from "./normalize-picker-open-url"

export type OpenUrlMode = "default" | "new_tab" | "new_window" | "current_tab"

/**
 * EN: Chrome effects to open/navigate the entry URL.
 * Tab rows with `tabId` use focus-in-place when `mode === "default"` (see `executePickerFocusPlan`).
 */
export function openEntryEffects(
  entry: PickerEntry,
  mode: OpenUrlMode = "new_tab"
): ChromeEffect[] {
  const url = normalizePickerOpenUrl(entry.url)
  if (!url) {
    return []
  }
  if (mode === "default" && entry.source === "tab" && entry.tabId != null) {
    return []
  }
  switch (mode) {
    case "new_window":
      return [{ kind: "open_url_new_window", url }]
    case "current_tab":
      return [{ kind: "navigate_current_tab", url }]
    case "new_tab":
    case "default":
    default:
      return [{ kind: "open_url_new_tab", url }]
  }
}
