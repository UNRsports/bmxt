import { DOM_PICKER_SETTINGS_KEY } from "../extension-storage/keys.ts"

export type DomPageActiveMode = "auto" | "manual"

export type DomPickerSettings = {
  pageActive: DomPageActiveMode
}

const DEFAULT_SETTINGS: DomPickerSettings = {
  pageActive: "auto"
}

export const DOM_PAGE_ACTIVE_MODE_TOKENS = ["--auto", "--manual"] as const

export function parseDomPageActiveModeToken(token: string): DomPageActiveMode | null {
  const t = token.trim().toLowerCase()
  if (t === "--auto") {
    return "auto"
  }
  if (t === "--manual") {
    return "manual"
  }
  return null
}

export function settingTokenForDomPageActiveMode(mode: DomPageActiveMode): string {
  return mode === "auto" ? "--auto" : "--manual"
}

export function parseDomPageActiveMode(raw: unknown): DomPageActiveMode {
  if (raw === "manual") {
    return "manual"
  }
  return "auto"
}

export async function loadDomPickerSettings(): Promise<DomPickerSettings> {
  const r = await chrome.storage.local.get(DOM_PICKER_SETTINGS_KEY)
  const raw = r[DOM_PICKER_SETTINGS_KEY]
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_SETTINGS }
  }
  const o = raw as Record<string, unknown>
  return {
    pageActive: parseDomPageActiveMode(o.pageActive)
  }
}

export async function saveDomPageActiveMode(mode: DomPageActiveMode): Promise<void> {
  const current = await loadDomPickerSettings()
  const next: DomPickerSettings = {
    ...current,
    pageActive: mode
  }
  await chrome.storage.local.set({
    [DOM_PICKER_SETTINGS_KEY]: next satisfies DomPickerSettings
  })
}
