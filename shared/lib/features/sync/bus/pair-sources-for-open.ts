import type { LocalOpenSource } from "./close-local-after-open.ts"
import { sanitizeRemoteOpenUrls } from "./remote-open-sanitize.ts"
import { parseOpenHttpUrl } from "../../url/parse-open-http-url.ts"

const MAX_URLS = 20

/**
 * EN: Pair local tab ids with the same sanitized URLs `openRemote` will send.
 * JA: `openRemote` が送るサニタイズ後 URL と local tabId を対応付ける。
 */
export function pairLocalSourcesForOpen(
  urls: readonly string[],
  tabIds: readonly (number | null)[]
): LocalOpenSource[] {
  const out: LocalOpenSource[] = []
  for (let i = 0; i < urls.length; i += 1) {
    if (out.length >= MAX_URLS) {
      break
    }
    const safe = parseOpenHttpUrl(urls[i]!)
    if (safe === null) {
      continue
    }
    out.push({
      url: safe,
      tabId: tabIds[i] ?? null
    })
  }
  return out
}

/** EN: Sources for bare CLI --close (URL lookup after sanitize). */
export function sanitizedUrlList(urls: readonly string[]): string[] {
  return sanitizeRemoteOpenUrls([...urls])
}
