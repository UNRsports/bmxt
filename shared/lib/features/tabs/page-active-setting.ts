import { TABS_PICKER_SETTINGS_KEY } from "../extension-storage/keys"

export type TabsPageActiveMode = "auto" | "manual"

export type TabsPickerSettings = {
  pageActive: TabsPageActiveMode
}

const DEFAULT_SETTINGS: TabsPickerSettings = {
  pageActive: "auto"
}

export const TABS_PAGE_ACTIVE_MODE_TOKENS = ["--auto", "--manual"] as const

export function parseTabsPageActiveModeToken(token: string): TabsPageActiveMode | null {
  const t = token.trim().toLowerCase()
  if (t === "--auto") {
    return "auto"
  }
  if (t === "--manual") {
    return "manual"
  }
  return null
}

export function settingTokenForPageActiveMode(mode: TabsPageActiveMode): string {
  return mode === "auto" ? "--auto" : "--manual"
}

export function parseTabsPageActiveMode(raw: unknown): TabsPageActiveMode {
  if (raw === "manual") {
    return "manual"
  }
  return "auto"
}

export async function loadTabsPickerSettings(): Promise<TabsPickerSettings> {
  const r = await chrome.storage.local.get(TABS_PICKER_SETTINGS_KEY)
  const raw = r[TABS_PICKER_SETTINGS_KEY]
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_SETTINGS }
  }
  const o = raw as Record<string, unknown>
  return {
    pageActive: parseTabsPageActiveMode(o.pageActive)
  }
}

export async function saveTabsPageActiveMode(mode: TabsPageActiveMode): Promise<void> {
  const current = await loadTabsPickerSettings()
  const next: TabsPickerSettings = {
    ...current,
    pageActive: mode
  }
  await chrome.storage.local.set({
    [TABS_PICKER_SETTINGS_KEY]: next satisfies TabsPickerSettings
  })
}
