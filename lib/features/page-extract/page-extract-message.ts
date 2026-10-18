/**
 * EN: Content-script channel to read `document.body.innerText` without SW `executeScript` host grants.
 * JA: SW の host 権限なしで innerText を取るための CS メッセージ。
 */

export const PAGE_EXTRACT_CHANNEL = "bmxt-page-extract" as const

export type PageExtractRequest = {
  channel: typeof PAGE_EXTRACT_CHANNEL
  maxChars: number
  /** EN: When true, return innerText length only (number). JA: true のとき文字数のみ返す。 */
  lengthOnly?: boolean
}

/**
 * EN: Runs via content script or `executeScript({ func })` — no imports (Chrome serializes the function).
 *     Callers must pass a positive finite cap from `clampPageExtractMaxChars`.
 * JA: CS / executeScript 用。import 禁止。呼び出し側で clamp 済みの正の上限を渡すこと。
 */
export function bmxtExtractPageInnerTextInPage(max: number): string {
  try {
    const t = document.body?.innerText ?? ""
    if (!Number.isFinite(max) || max <= 0) {
      return ""
    }
    return t.length > max ? t.slice(0, max) : t
  } catch {
    return ""
  }
}

/** EN: In-page innerText length without transferring body text to the extension. */
export function bmxtProbePageInnerTextLengthInPage(): number {
  try {
    return document.body?.innerText?.length ?? 0
  } catch {
    return 0
  }
}

export function isPageExtractRequest(raw: unknown): raw is PageExtractRequest {
  if (!raw || typeof raw !== "object") {
    return false
  }
  const o = raw as PageExtractRequest
  if (o.channel !== PAGE_EXTRACT_CHANNEL || typeof o.maxChars !== "number") {
    return false
  }
  if (!Number.isFinite(o.maxChars)) {
    return false
  }
  if (o.lengthOnly !== undefined && typeof o.lengthOnly !== "boolean") {
    return false
  }
  return true
}
