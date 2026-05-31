import { TYPING_TRANSLATE_KEY } from "../extension-storage/keys"

export type TranslateSettings = {
  enabled: boolean
}

const DEFAULT_SETTINGS: TranslateSettings = { enabled: false }

export async function loadTranslateSettings(): Promise<TranslateSettings> {
  const r = await chrome.storage.local.get(TYPING_TRANSLATE_KEY)
  const raw = r[TYPING_TRANSLATE_KEY]
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_SETTINGS }
  }
  const o = raw as Record<string, unknown>
  return {
    enabled: o.enabled === true
  }
}

export async function saveTranslateEnabled(enabled: boolean): Promise<void> {
  await chrome.storage.local.set({
    [TYPING_TRANSLATE_KEY]: { enabled } satisfies TranslateSettings
  })
}
