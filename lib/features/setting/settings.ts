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

export type UiSettings = {
  locale: UiLocale
  appearance: UiAppearance
}

const DEFAULT_SETTINGS: UiSettings = {
  locale: DEFAULT_UI_LOCALE,
  appearance: { ...DEFAULT_UI_APPEARANCE, picker: { ...DEFAULT_UI_APPEARANCE.picker } }
}

let cachedUiSettings: UiSettings | null = null

function parseUiSettingsRaw(raw: unknown): UiSettings {
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
  if (cachedUiSettings) {
    return cachedUiSettings
  }
  const r = await chrome.storage.local.get(UI_SETTINGS_KEY)
  cachedUiSettings = parseUiSettingsRaw(r[UI_SETTINGS_KEY])
  return cachedUiSettings
}

export function invalidateUiSettingsCache(): void {
  cachedUiSettings = null
}

async function saveUiSettings(next: UiSettings): Promise<void> {
  cachedUiSettings = next
  await chrome.storage.local.set({
    [UI_SETTINGS_KEY]: next satisfies UiSettings
  })
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

export async function replaceUiSettings(next: UiSettings): Promise<void> {
  await saveUiSettings({
    locale: next.locale,
    appearance: normalizeUiAppearance(next.appearance)
  })
}

export function formatUiSettingsSummary(settings: UiSettings, locale: UiLocale): string[] {
  return formatUiSettingsSummaryLines(locale, settings)
}
