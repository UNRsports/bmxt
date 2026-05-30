export type TranslationTriplet = {
  source: string
  forward: string
  back: string
}

export function isBuiltInTranslatorSupported(): boolean {
  return typeof Translator !== "undefined"
}

export async function jaEnPairAvailability(): Promise<TranslatorAvailability | "unsupported"> {
  if (!isBuiltInTranslatorSupported()) {
    return "unsupported"
  }
  return Translator.availability({ sourceLanguage: "ja", targetLanguage: "en" })
}

let jaToEn: Translator | null = null
let enToJa: Translator | null = null

async function getJaToEn(): Promise<Translator> {
  if (!jaToEn) {
    jaToEn = await Translator.create({ sourceLanguage: "ja", targetLanguage: "en" })
  }
  return jaToEn
}

async function getEnToJa(): Promise<Translator> {
  if (!enToJa) {
    enToJa = await Translator.create({ sourceLanguage: "en", targetLanguage: "ja" })
  }
  return enToJa
}

export function resetTranslatorInstances(): void {
  jaToEn?.destroy()
  enToJa?.destroy()
  jaToEn = null
  enToJa = null
}

/** EN: ja → en (nav typing commit). */
export async function translateJaToEn(sentence: string, signal?: AbortSignal): Promise<string> {
  if (!isBuiltInTranslatorSupported()) {
    throw new Error("Translator API is not available in this Chrome build.")
  }
  const fwd = await getJaToEn()
  return fwd.translate(sentence, { signal })
}

/** EN: ja → en → ja (back-translation for review). */
export async function translateJaEnJa(
  sentence: string,
  signal?: AbortSignal
): Promise<TranslationTriplet> {
  if (!isBuiltInTranslatorSupported()) {
    throw new Error("Translator API is not available in this Chrome build.")
  }
  const forward = await translateJaToEn(sentence, signal)
  const backTr = await getEnToJa()
  const back = await backTr.translate(forward, { signal })
  return { source: sentence, forward, back }
}
