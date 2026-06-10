import { UI_SETTINGS_KEY } from "../extension-storage/keys"
import {
  DEFAULT_UI_APPEARANCE,
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
  appearance: { ...DEFAULT_UI_APPEARANCE }
}

function parseAppearance(raw: unknown): UiAppearance {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_UI_APPEARANCE }
  }
  const o = raw as Record<string, unknown>
  return {
    fg: typeof o.fg === "string" ? o.fg : null,
    bgColor: typeof o.bgColor === "string" ? o.bgColor : null,
    fontSize: typeof o.fontSize === "string" ? o.fontSize : null,
    fontFamily: typeof o.fontFamily === "string" ? o.fontFamily : null,
    bgImageDataUrl: typeof o.bgImageDataUrl === "string" ? o.bgImageDataUrl : null
  }
}

export async function loadUiSettings(): Promise<UiSettings> {
  const r = await chrome.storage.local.get(UI_SETTINGS_KEY)
  const raw = r[UI_SETTINGS_KEY]
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_SETTINGS, appearance: { ...DEFAULT_UI_APPEARANCE } }
  }
  const o = raw as Record<string, unknown>
  return {
    locale: parseUiLocale(o.locale),
    appearance: parseAppearance(o.appearance)
  }
}

async function saveUiSettings(next: UiSettings): Promise<void> {
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
  const appearance: UiAppearance = {
    ...current.appearance,
    ...patch
  }
  await saveUiSettings({ ...current, appearance })
}

export async function resetUiAppearance(): Promise<void> {
  const current = await loadUiSettings()
  await saveUiSettings({
    ...current,
    appearance: { ...DEFAULT_UI_APPEARANCE }
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
    appearance: { ...DEFAULT_UI_APPEARANCE, ...next.appearance }
  })
}

export function formatUiSettingsSummary(settings: UiSettings, locale: UiLocale): string[] {
  return formatUiSettingsSummaryLines(locale, settings)
}
