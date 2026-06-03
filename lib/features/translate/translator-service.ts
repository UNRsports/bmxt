import {
  DEFAULT_TRANSLATION_PAIR_ID,
  getTranslationPairDef,
  type TranslationPairId
} from "./translation-pair"

export type TranslationResult = {
  source: string
  forward: string
}

export function isBuiltInTranslatorSupported(): boolean {
  return typeof Translator !== "undefined"
}

export async function pairAvailability(
  pairId: TranslationPairId = DEFAULT_TRANSLATION_PAIR_ID
): Promise<TranslatorAvailability | "unsupported"> {
  if (!isBuiltInTranslatorSupported()) {
    return "unsupported"
  }
  const { sourceLanguage, targetLanguage } = getTranslationPairDef(pairId)
  return Translator.availability({ sourceLanguage, targetLanguage })
}

/** @deprecated Use `pairAvailability(pairId)` — kept for call sites migrating gradually. */
export async function jaEnPairAvailability(): Promise<TranslatorAvailability | "unsupported"> {
  return pairAvailability("ja-en")
}

const translatorCache = new Map<string, Translator>()

function translatorCacheKey(sourceLanguage: string, targetLanguage: string): string {
  return `${sourceLanguage}\t${targetLanguage}`
}

async function getTranslator(sourceLanguage: string, targetLanguage: string): Promise<Translator> {
  const key = translatorCacheKey(sourceLanguage, targetLanguage)
  let instance = translatorCache.get(key)
  if (!instance) {
    instance = await Translator.create({ sourceLanguage, targetLanguage })
    translatorCache.set(key, instance)
  }
  return instance
}

export function resetTranslatorInstances(): void {
  for (const instance of translatorCache.values()) {
    instance.destroy()
  }
  translatorCache.clear()
}

/** EN: First hop: source language → target language for the pair. */
export async function translateForward(
  pairId: TranslationPairId,
  sentence: string,
  signal?: AbortSignal
): Promise<string> {
  if (!isBuiltInTranslatorSupported()) {
    throw new Error("Translator API is not available in this Chrome build.")
  }
  const { sourceLanguage, targetLanguage } = getTranslationPairDef(pairId)
  const translator = await getTranslator(sourceLanguage, targetLanguage)
  return translator.translate(sentence, { signal })
}

/** EN: Forward translation per newline-delimited row; preserves `\n` layout. */
export async function translateForwardMultiline(
  pairId: TranslationPairId,
  source: string,
  signal?: AbortSignal
): Promise<TranslationResult> {
  const lines = source.split("\n")
  const forwardParts: string[] = []
  for (const line of lines) {
    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError")
    }
    if (line.trim().length === 0) {
      forwardParts.push("")
      continue
    }
    forwardParts.push(await translateForward(pairId, line, signal))
  }
  return {
    source,
    forward: forwardParts.join("\n")
  }
}

/** EN: ja → en (nav typing commit helper for default pair). */
export async function translateJaToEn(sentence: string, signal?: AbortSignal): Promise<string> {
  return translateForward("ja-en", sentence, signal)
}
