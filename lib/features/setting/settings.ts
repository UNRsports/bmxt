import { UI_SETTINGS_KEY } from "../extension-storage/keys"
import {
  DEFAULT_UI_APPEARANCE,
  normalizeUiAppearance,
  type UiAppearance
} from "./appearance"
import {
  DEFAULT_EXTRA_KEYS_MODE,
  normalizeExtraKeysMode,
  type ExtraKeysMode
} from "./extra-keys-mode.ts"
import { formatUiSettingsSummaryLines } from "./i18n/resolvers"
import {
  DEFAULT_UI_LOCALE,
  parseUiLocale,
  type UiLocale
} from "./locale"
import {
  activateInternalUiSettingsStorage,
  clearExternalUiSettingsStorage,
  loadUiSettingsFromDirectory,
  tryLoadUiSettingsFromExternal,
  trySaveUiSettingsToExternal
} from "./settings-external-storage"

export type UiSettings = {
  locale: UiLocale
  appearance: UiAppearance
  /** EN: Soft Tab/Ctrl/arrow bar — auto shows on Android. */
  extraKeysMode: ExtraKeysMode
}

/** EN: Normalize partial storage / import objects (backward compatible). */
export function normalizeUiSettings(raw: Partial<UiSettings> | null | undefined): UiSettings {
  if (!raw || typeof raw !== "object") {
    return {
      locale: DEFAULT_UI_LOCALE,
      appearance: normalizeUiAppearance(null),
      extraKeysMode: DEFAULT_EXTRA_KEYS_MODE
    }
  }
  return {
    locale: parseUiLocale(raw.locale),
    appearance: normalizeUiAppearance(raw.appearance),
    extraKeysMode: normalizeExtraKeysMode(raw.extraKeysMode)
  }
}

async function loadUiSettingsFromChromeStorage(): Promise<UiSettings> {
  const r = await chrome.storage.local.get(UI_SETTINGS_KEY)
  const raw = r[UI_SETTINGS_KEY]
  if (!raw || typeof raw !== "object") {
    return normalizeUiSettings(null)
  }
  return normalizeUiSettings(raw as Partial<UiSettings>)
}

export async function loadUiSettingsInternalCache(): Promise<UiSettings> {
  return loadUiSettingsFromChromeStorage()
}

export async function resetUiSettingsToDefaultsAndInternal(): Promise<UiSettings> {
  const defaults = normalizeUiSettings({
    locale: DEFAULT_UI_LOCALE,
    appearance: DEFAULT_UI_APPEARANCE,
    extraKeysMode: DEFAULT_EXTRA_KEYS_MODE
  })
  await saveUiSettingsToChromeStorage(defaults)
  await activateInternalUiSettingsStorage()
  await clearExternalUiSettingsStorage()
  return defaults
}

export async function mirrorUiSettingsToInternalCache(next: UiSettings): Promise<void> {
  await saveUiSettingsToChromeStorage(normalizeUiSettings(next))
}

export async function applyDefaultUiSettingsToInternalCache(): Promise<UiSettings> {
  const defaults = normalizeUiSettings({
    locale: DEFAULT_UI_LOCALE,
    appearance: DEFAULT_UI_APPEARANCE,
    extraKeysMode: DEFAULT_EXTRA_KEYS_MODE
  })
  await saveUiSettingsToChromeStorage(defaults)
  return defaults
}

export async function loadUiSettings(): Promise<UiSettings> {
  const external = await tryLoadUiSettingsFromExternal()
  if (external) {
    await mirrorUiSettingsToInternalCache(external)
    return external
  }
  return loadUiSettingsFromChromeStorage()
}

async function saveUiSettingsToChromeStorage(next: UiSettings): Promise<void> {
  await chrome.storage.local.set({
    [UI_SETTINGS_KEY]: next satisfies UiSettings
  })
}

async function saveUiSettings(next: UiSettings): Promise<{ externalWriteFailed: boolean }> {
  const normalized = normalizeUiSettings(next)
  await saveUiSettingsToChromeStorage(normalized)
  try {
    await trySaveUiSettingsToExternal(normalized)
    return { externalWriteFailed: false }
  } catch {
    return { externalWriteFailed: true }
  }
}

export async function saveUiLocale(locale: UiLocale): Promise<void> {
  const current = await loadUiSettings()
  await saveUiSettings({ ...current, locale })
}

export async function saveUiAppearancePatch(patch: Partial<UiAppearance>): Promise<void> {
  const current = await loadUiSettings()
  const appearance = normalizeUiAppearance({ ...current.appearance, ...patch })
  await saveUiSettings({ ...current, appearance })
}

export async function resetUiAppearance(): Promise<void> {
  const current = await loadUiSettings()
  await saveUiSettings({
    ...current,
    appearance: normalizeUiAppearance(DEFAULT_UI_APPEARANCE)
  })
}

export async function saveUiBackgroundImage(dataUrl: string): Promise<void> {
  await saveUiAppearancePatch({ bgImageDataUrl: dataUrl })
}

export async function clearUiBackgroundImage(): Promise<void> {
  await saveUiAppearancePatch({ bgImageDataUrl: null })
}

export async function replaceUiSettings(next: UiSettings): Promise<{ externalWriteFailed: boolean }> {
  return saveUiSettings(next)
}

export function formatUiSettingsSummary(settings: UiSettings, locale: UiLocale): string[] {
  return formatUiSettingsSummaryLines(locale, settings)
}
