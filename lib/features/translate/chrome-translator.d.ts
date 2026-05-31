/**
 * Chrome built-in Translator API (Gemini Nano). Extension pages only.
 * @see https://developer.chrome.com/docs/ai/translator-api
 */

type TranslatorAvailability = "available" | "downloadable" | "unavailable"

interface TranslatorCreateOptions {
  sourceLanguage: string
  targetLanguage: string
  signal?: AbortSignal
  monitor?: (monitor: TranslatorDownloadMonitor) => void
}

interface TranslatorDownloadMonitor extends EventTarget {
  addEventListener(type: "downloadprogress", listener: (ev: TranslatorDownloadProgressEvent) => void): void
}

interface TranslatorDownloadProgressEvent extends Event {
  readonly loaded: number
  readonly total: number
}

interface TranslatorTranslateOptions {
  signal?: AbortSignal
}

interface TranslatorConstructorOptions {
  sourceLanguage: string
  targetLanguage: string
}

declare class Translator {
  static availability(options: TranslatorConstructorOptions): Promise<TranslatorAvailability>
  static create(options: TranslatorCreateOptions): Promise<Translator>
  translate(input: string, options?: TranslatorTranslateOptions): Promise<string>
  destroy(): void
}
