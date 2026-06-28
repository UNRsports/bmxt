import type { SettingMessageKey } from "./i18n/ns/setting"
import { tSetting } from "./i18n/ns/setting"
import type { UiLocale } from "./locale"
import type { ExternalBundleMissingItem } from "./settings-external-storage"

const MISSING_MESSAGE_KEY: Record<ExternalBundleMissingItem["kind"], SettingMessageKey> = {
  directory_handle: "setting.storage.recovery.missing.directoryHandle",
  directory_permission: "setting.storage.recovery.missing.directoryPermission",
  settings_json: "setting.storage.recovery.missing.settingsJson",
  settings_json_invalid: "setting.storage.recovery.missing.settingsJsonInvalid",
  background_image: "setting.storage.recovery.missing.backgroundImage",
  picker_background_image: "setting.storage.recovery.missing.pickerBackgroundImage"
}

export function formatExternalBundleMissingLine(
  locale: UiLocale,
  item: ExternalBundleMissingItem
): string {
  const key = MISSING_MESSAGE_KEY[item.kind]
  if (item.fileName) {
    return tSetting(key, locale, { file: item.fileName })
  }
  return tSetting(key, locale)
}

export function externalSettingsRecoveryLogLines(
  locale: UiLocale,
  directoryName: string | null,
  missing: readonly ExternalBundleMissingItem[]
): string[] {
  const location =
    directoryName ?? tSetting("setting.storage.recovery.locationUnknown", locale)
  const lines = [
    tSetting("setting.storage.recovery.warning", locale, { location }),
    tSetting("setting.storage.recovery.missingHead", locale)
  ]
  for (const item of missing) {
    lines.push(`  - ${formatExternalBundleMissingLine(locale, item)}`)
  }
  lines.push(tSetting("setting.storage.recovery.prompt", locale))
  return lines
}
