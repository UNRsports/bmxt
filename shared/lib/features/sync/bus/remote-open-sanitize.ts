import { parseOpenHttpUrl } from "../../url/parse-open-http-url.ts"

const MAX_URLS = 20
const MAX_GROUP_TITLE_LEN = 64

export function sanitizeRemoteOpenUrls(urls: string[]): string[] {
  const out: string[] = []
  for (const raw of urls) {
    const safe = parseOpenHttpUrl(raw)
    if (safe !== null) {
      out.push(safe)
    }
    if (out.length >= MAX_URLS) {
      break
    }
  }
  return out
}

export function sanitizeGroupTitle(raw: string | null): string | null {
  if (raw === null) {
    return null
  }
  const trimmed = raw.trim()
  if (trimmed.length === 0 || trimmed.length > MAX_GROUP_TITLE_LEN) {
    return null
  }
  for (let i = 0; i < trimmed.length; i += 1) {
    const code = trimmed.charCodeAt(i)
    if (code < 0x20 || code === 0x7f) {
      return null
    }
  }
  return trimmed
}
