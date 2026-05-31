/** EN: Canonical translation pair ids (storage / logic). Setting tokens use `--` prefix. */

export const TRANSLATION_PAIR_IDS = ["ja-en", "en-ja"] as const

export type TranslationPairId = (typeof TRANSLATION_PAIR_IDS)[number]

export type TranslationPairDef = {
  readonly id: TranslationPairId
  /** EN: Third token after `translate -setting` (Tab completion). */
  readonly settingToken: string
  readonly sourceLanguage: string
  readonly targetLanguage: string
  /** EN: Language injected on nav Alt-hold commit (`forward` field). */
  readonly commitLanguage: string
  /** EN: Shown on translate status bar. */
  readonly statusLabel: string
}

export const TRANSLATION_PAIRS: readonly TranslationPairDef[] = [
  {
    id: "ja-en",
    settingToken: "--ja-en",
    sourceLanguage: "ja",
    targetLanguage: "en",
    commitLanguage: "en",
    statusLabel: "--ja-en"
  },
  {
    id: "en-ja",
    settingToken: "--en-ja",
    sourceLanguage: "en",
    targetLanguage: "ja",
    commitLanguage: "ja",
    statusLabel: "--en-ja"
  }
] as const

const PAIR_BY_ID: Record<TranslationPairId, TranslationPairDef> = {
  "ja-en": TRANSLATION_PAIRS[0]!,
  "en-ja": TRANSLATION_PAIRS[1]!
}

const PAIR_BY_SETTING_TOKEN = new Map<string, TranslationPairId>(
  TRANSLATION_PAIRS.map((p) => [p.settingToken.toLowerCase(), p.id])
)

export const DEFAULT_TRANSLATION_PAIR_ID: TranslationPairId = "ja-en"

export function getTranslationPairDef(pairId: TranslationPairId): TranslationPairDef {
  return PAIR_BY_ID[pairId]
}

export function parseTranslationPairId(raw: unknown): TranslationPairId {
  if (typeof raw === "string" && raw in PAIR_BY_ID) {
    return raw as TranslationPairId
  }
  return DEFAULT_TRANSLATION_PAIR_ID
}

export function pairIdFromSettingToken(token: string): TranslationPairId | null {
  const key = token.trim().toLowerCase()
  const id = PAIR_BY_SETTING_TOKEN.get(key)
  return id ?? null
}

export function settingTokenForPairId(pairId: TranslationPairId): string {
  return getTranslationPairDef(pairId).settingToken
}

export function listTranslationPairSettingTokens(): readonly string[] {
  return TRANSLATION_PAIRS.map((p) => p.settingToken)
}

/** EN: Bilingual UI copy for one panel heading (JA primary + EN subline). */
export type BilingualUiLabel = {
  readonly ja: string
  readonly en: string
}

export type TranslationFieldLabels = {
  readonly source: BilingualUiLabel
  readonly forward: BilingualUiLabel
  readonly back: BilingualUiLabel
}

const LANGUAGE_UI_TAG: Record<string, { ja: string; en: string }> = {
  ja: { ja: "JA", en: "Japanese" },
  en: { ja: "EN", en: "English" }
}

function languageUiTag(code: string): { ja: string; en: string } {
  const tag = LANGUAGE_UI_TAG[code]
  if (!tag) {
    return { ja: code.toUpperCase(), en: code }
  }
  return tag
}

/** EN: 原文 / 訳 / 再訳 headings for the active `-setting` pair. */
export function getTranslationFieldLabels(pairId: TranslationPairId): TranslationFieldLabels {
  const { sourceLanguage, targetLanguage } = getTranslationPairDef(pairId)
  const src = languageUiTag(sourceLanguage)
  const tgt = languageUiTag(targetLanguage)
  return {
    source: {
      ja: `原文（${src.ja}）`,
      en: `Source (${src.en})`
    },
    forward: {
      ja: `訳（${tgt.ja}）`,
      en: `Translation (${tgt.en})`
    },
    back: {
      ja: `再訳（${src.ja}）`,
      en: `Back-translation (${src.en})`
    }
  }
}
