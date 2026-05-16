import type { ChromeEffect } from "../../dispatch/effect-types"
import type { PickerEntry } from "./picker-entry"
import { normalizePickerOpenUrl } from "./normalize-picker-open-url"

export type OpenUrlMode = "default" | "new_tab" | "new_window" | "current_tab"

/** EN: Chrome effects to open/navigate the entry URL (tabs focus uses separate path when tabId set). */
export function openEntryEffects(
  entry: PickerEntry,
  mode: OpenUrlMode = "new_tab"
): ChromeEffect[] {
  const url = normalizePickerOpenUrl(entry.url)
  if (!url) {
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
