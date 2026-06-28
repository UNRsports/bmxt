import { UI_SETTINGS_STORAGE_CONFIG_KEY } from "../extension-storage/keys"
import {
  DEFAULT_UI_SETTINGS_STORAGE_CONFIG,
  normalizeUiSettingsStorageConfig,
  type UiSettingsStorageConfig
} from "./settings-storage-mode"

export type { UiSettingsStorageConfig, UiSettingsStorageMode } from "./settings-storage-mode"
export {
  DEFAULT_UI_SETTINGS_STORAGE_CONFIG,
  normalizeUiSettingsStorageConfig
} from "./settings-storage-mode"

export async function loadUiSettingsStorageConfig(): Promise<UiSettingsStorageConfig> {
  const r = await chrome.storage.local.get(UI_SETTINGS_STORAGE_CONFIG_KEY)
  const raw = r[UI_SETTINGS_STORAGE_CONFIG_KEY]
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_UI_SETTINGS_STORAGE_CONFIG }
  }
  return normalizeUiSettingsStorageConfig(raw as Partial<UiSettingsStorageConfig>)
}

export async function saveUiSettingsStorageConfig(
  next: UiSettingsStorageConfig
): Promise<void> {
  await chrome.storage.local.set({
    [UI_SETTINGS_STORAGE_CONFIG_KEY]: normalizeUiSettingsStorageConfig(next)
  })
}
