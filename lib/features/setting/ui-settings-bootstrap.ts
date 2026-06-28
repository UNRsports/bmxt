import { SETTINGS_JSON_NAME } from "./settings-bundle-layout"
import type { UiLocale } from "./locale"
import { tSetting } from "./i18n/ns/setting"
import {
  applyDefaultUiSettingsToInternalCache,
  loadUiSettingsInternalCache,
  mirrorUiSettingsToInternalCache,
  type UiSettings
} from "./settings"
import {
  inspectExternalSettingsBundle,
  reloadUiSettingsFromExternalDirectory,
  type ExternalBundleMissingItem
} from "./settings-external-storage"
import { loadUiSettingsStorageConfig } from "./settings-storage-config"

export type UiSettingsBootstrapResult =
  | { kind: "internal"; settings: UiSettings }
  | { kind: "synced"; settings: UiSettings }
  | {
      kind: "needs_recovery"
      settings: UiSettings
      directoryName: string | null
      missing: ExternalBundleMissingItem[]
    }
  | {
      kind: "load_error"
      settings: UiSettings
      directoryName: string | null
      fileName: string
    }

function isJsonLoadErrorOnly(missing: readonly ExternalBundleMissingItem[]): boolean {
  return missing.length > 0 && missing.every((item) => item.kind === "settings_json_invalid")
}

/** EN: Each BMXt window launch — external bundle is authoritative when external mode is on. */
export async function bootstrapUiSettingsOnWindowLaunch(): Promise<UiSettingsBootstrapResult> {
  const config = await loadUiSettingsStorageConfig()
  if (config.mode !== "external") {
    return { kind: "internal", settings: await loadUiSettingsInternalCache() }
  }

  const inspection = await inspectExternalSettingsBundle()
  if (inspection.status === "not_external") {
    return { kind: "internal", settings: await loadUiSettingsInternalCache() }
  }

  if (inspection.status === "incomplete") {
    if (isJsonLoadErrorOnly(inspection.missing)) {
      const defaults = await applyDefaultUiSettingsToInternalCache()
      const fileName = inspection.missing[0]?.fileName ?? SETTINGS_JSON_NAME
      return {
        kind: "load_error",
        settings: defaults,
        directoryName: inspection.directoryName,
        fileName
      }
    }
    return {
      kind: "needs_recovery",
      settings: await loadUiSettingsInternalCache(),
      directoryName: inspection.directoryName,
      missing: inspection.missing
    }
  }

  const loaded = await reloadUiSettingsFromExternalDirectory()
  if (!loaded.ok) {
    const defaults = await applyDefaultUiSettingsToInternalCache()
    return {
      kind: "load_error",
      settings: defaults,
      directoryName: inspection.directoryName,
      fileName: SETTINGS_JSON_NAME
    }
  }

  await mirrorUiSettingsToInternalCache(loaded.settings)
  return { kind: "synced", settings: loaded.settings }
}

export function externalSettingsLoadErrorLogLines(
  locale: UiLocale,
  directoryName: string | null,
  fileName: string
): string[] {
  const location =
    directoryName ?? tSetting("setting.storage.recovery.locationUnknown", locale)
  return [
    tSetting("setting.storage.loadError.warning", locale, { location, file: fileName }),
    tSetting("setting.storage.loadError.defaults", locale)
  ]
}
