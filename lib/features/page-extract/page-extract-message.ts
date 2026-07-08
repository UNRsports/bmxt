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

/** EN: Runs in the page world (content script). Keep free of imports that pull extension APIs. */
export function bmxtExtractPageInnerTextInPage(max: number): string {
  try {
    const t = document.body?.innerText ?? ""
    return max > 0 && t.length > max ? t.slice(0, max) : t
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
  if (o.lengthOnly !== undefined && typeof o.lengthOnly !== "boolean") {
    return false
  }
  return true
}
