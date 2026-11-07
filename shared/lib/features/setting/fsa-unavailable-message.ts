import { tSetting } from "./i18n/ns/setting"
import type { UiLocale } from "./locale"
import { looksLikeBraveSync } from "./detect-brave"

/**
 * EN: Storage / vault picker — Brave needs the File System Access flag.
 * JA: storage / vault ピッカー。Brave は File System Access フラグが必要。
 */
export function storageFsaUnavailableLine(locale: UiLocale): string {
  if (looksLikeBraveSync()) {
    return tSetting("setting.storage.unavailableBrave", locale)
  }
  return tSetting("setting.storage.unavailable", locale)
}
