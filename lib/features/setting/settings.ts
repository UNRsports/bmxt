import { UI_SETTINGS_KEY } from "../extension-storage/keys"
import {
  DEFAULT_UI_APPEARANCE,
  normalizeUiAppearance,
  type UiAppearance
} from "./appearance"
import { formatUiSettingsSummaryLines } from "./i18n/resolvers"
import {
  DEFAULT_UI_LOCALE,
  parseUiLocale,
  type UiLocale
} from "./locale"
import { tryLoadUiSettingsFromExternal, trySaveUiSettingsToExternal } from "./settings-external-storage"

export type UiSettings = {
  locale: UiLocale
  appearance: UiAppearance
}

const DEFAULT_SETTINGS: UiSettings = {
  locale: DEFAULT_UI_LOCALE,
  appearance: { ...DEFAULT_UI_APPEARANCE, picker: { ...DEFAULT_UI_APPEARANCE.picker } }
}

async function loadUiSettingsFromChromeStorage(): Promise<UiSettings> {
  const r = await chrome.storage.local.get(UI_SETTINGS_KEY)
  const raw = r[UI_SETTINGS_KEY]
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_SETTINGS, appearance: normalizeUiAppearance(null) }
  }
  const o = raw as Record<string, unknown>
  return {
    locale: parseUiLocale(o.locale),
    appearance: normalizeUiAppearance(o.appearance as Partial<UiAppearance>)
  }
}

export async function loadUiSettings(): Promise<UiSettings> {
  const external = await tryLoadUiSettingsFromExternal()
  if (external) {
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
  const normalized: UiSettings = {
    locale: next.locale,
    appearance: normalizeUiAppearance(next.appearance)
  }
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
  return saveUiSettings({
    locale: next.locale,
    appearance: normalizeUiAppearance(next.appearance)
  })
}

export function formatUiSettingsSummary(settings: UiSettings, locale: UiLocale): string[] {
  return formatUiSettingsSummaryLines(locale, settings)
}
