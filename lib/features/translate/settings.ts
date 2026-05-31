import { TYPING_TRANSLATE_KEY } from "../extension-storage/keys"
import {
  DEFAULT_TRANSLATION_PAIR_ID,
  parseTranslationPairId,
  type TranslationPairId
} from "./translation-pair"

export type TranslateSettings = {
  enabled: boolean
  pair: TranslationPairId
}

const DEFAULT_SETTINGS: TranslateSettings = {
  enabled: false,
  pair: DEFAULT_TRANSLATION_PAIR_ID
}

export async function loadTranslateSettings(): Promise<TranslateSettings> {
  const r = await chrome.storage.local.get(TYPING_TRANSLATE_KEY)
  const raw = r[TYPING_TRANSLATE_KEY]
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_SETTINGS }
  }
  const o = raw as Record<string, unknown>
  return {
    enabled: o.enabled === true,
    pair: parseTranslationPairId(o.pair)
  }
}

export async function saveTranslateSettings(
  patch: Partial<TranslateSettings>
): Promise<void> {
  const current = await loadTranslateSettings()
  const next: TranslateSettings = {
    enabled: patch.enabled !== undefined ? patch.enabled === true : current.enabled,
    pair: patch.pair !== undefined ? parseTranslationPairId(patch.pair) : current.pair
  }
  await chrome.storage.local.set({
    [TYPING_TRANSLATE_KEY]: next satisfies TranslateSettings
  })
}

export async function saveTranslateEnabled(enabled: boolean): Promise<void> {
  await saveTranslateSettings({ enabled })
}

export async function saveTranslatePair(pair: TranslationPairId): Promise<void> {
  await saveTranslateSettings({ pair })
}
