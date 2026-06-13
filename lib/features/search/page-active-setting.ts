import { SEARCH_PICKER_SETTINGS_KEY } from "../extension-storage/keys"

export type SearchPageActiveMode = "auto" | "manual"

export type SearchPickerSettings = {
  pageActive: SearchPageActiveMode
}

const DEFAULT_SETTINGS: SearchPickerSettings = {
  pageActive: "auto"
}

export const SEARCH_PAGE_ACTIVE_MODE_TOKENS = ["--auto", "--manual"] as const

export function parseSearchPageActiveModeToken(token: string): SearchPageActiveMode | null {
  const t = token.trim().toLowerCase()
  if (t === "--auto") {
    return "auto"
  }
  if (t === "--manual") {
    return "manual"
  }
  return null
}

export function settingTokenForSearchPageActiveMode(mode: SearchPageActiveMode): string {
  return mode === "auto" ? "--auto" : "--manual"
}

export function parseSearchPageActiveMode(raw: unknown): SearchPageActiveMode {
  if (raw === "manual") {
    return "manual"
  }
  return "auto"
}

export async function loadSearchPickerSettings(): Promise<SearchPickerSettings> {
  const r = await chrome.storage.local.get(SEARCH_PICKER_SETTINGS_KEY)
  const raw = r[SEARCH_PICKER_SETTINGS_KEY]
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_SETTINGS }
  }
  const o = raw as Record<string, unknown>
  return {
    pageActive: parseSearchPageActiveMode(o.pageActive)
  }
}

export async function saveSearchPageActiveMode(mode: SearchPageActiveMode): Promise<void> {
  const current = await loadSearchPickerSettings()
  const next: SearchPickerSettings = {
    ...current,
    pageActive: mode
  }
  await chrome.storage.local.set({
    [SEARCH_PICKER_SETTINGS_KEY]: next satisfies SearchPickerSettings
  })
}
