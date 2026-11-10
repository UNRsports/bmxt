import { tSetting } from "./i18n/ns/setting"
import type { UiLocale } from "./locale"
import { looksLikeBraveSync } from "./detect-brave"

/**
 * EN: UI settings / vault external folder — Brave needs the File System Access flag.
 * JA: UI 設定／vault 外部フォルダ。Brave は File System Access フラグが必要。
 */
export function storageFsaUnavailableLine(locale: UiLocale): string {
  if (looksLikeBraveSync()) {
    return tSetting("setting.storage.unavailableBrave", locale)
  }
  return tSetting("setting.storage.unavailable", locale)
}
