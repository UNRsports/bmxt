import {
  NEW_GROUP_COLORS,
  type NewGroupPaletteColor
} from "../../tabs/tab-picker-overlay-constants.ts"
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

export function sanitizeGroupTitle(raw: string | null | undefined): string | null {
  if (raw === null || raw === undefined) {
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

/**
 * EN: Accept only chrome.tabGroups.Color enum strings (exact match on peer).
 * JA: chrome.tabGroups.Color の列挙のみ通す（peer 側で同色をそのまま設定可能）。
 */
export function sanitizeGroupColor(raw: string | null | undefined): NewGroupPaletteColor | null {
  if (raw === null || raw === undefined) {
    return null
  }
  const trimmed = raw.trim()
  if ((NEW_GROUP_COLORS as readonly string[]).includes(trimmed)) {
    return trimmed as NewGroupPaletteColor
  }
  return null
}
