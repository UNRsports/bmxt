/**
 * EN: Mirrors `optional_host_permissions` in `package.json` — keep origins in sync.
 * JA: `package.json` の optional_host_permissions と同一パターンに保つこと。
 */

import { readTabInnerText } from "../page-extract/read-tab-inner-text"
import { DEFAULT_UI_LOCALE } from "../setting/locale"
import { optionalHostDeniedLines } from "../setting/i18n"
import { isHttpUrl } from "../url/is-http-url"

export const OPTIONAL_HTTP_HOST_ORIGINS = ["http://*/*", "https://*/*"] as const

export type OptionalHostAccessResult = "granted" | "denied" | "already"

async function listHttpTabIdsForProbe(): Promise<number[]> {
  const ids: number[] = []
  const seen = new Set<number>()
  try {
    const [active] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
    if (typeof active?.id === "number" && !active.discarded && isHttpUrl(active.url)) {
      ids.push(active.id)
      seen.add(active.id)
    }
  } catch {
    /* ignore */
  }
  try {
    const all = await chrome.tabs.query({})
    for (const t of all) {
      if (typeof t.id !== "number" || t.discarded || !isHttpUrl(t.url) || seen.has(t.id)) {
        continue
      }
      ids.push(t.id)
      seen.add(t.id)
      if (ids.length >= 5) {
        break
      }
    }
  } catch {
    /* ignore */
  }
  return ids
}

/**
 * EN: True when http(s) tab text can be read (content script and/or `executeScript`).
 * JA: http(s) タブの本文を取得できるか（CS または executeScript）。
 */
export async function canScriptHttpHostPages(): Promise<boolean> {
  try {
    const origins = [...OPTIONAL_HTTP_HOST_ORIGINS] as string[]
    if (await chrome.permissions.contains({ origins })) {
      return true
    }
  } catch {
    /* fall through */
  }
  for (const tabId of await listHttpTabIdsForProbe()) {
    const sample = await readTabInnerText(tabId, 1)
    if (sample !== null) {
      return true
    }
  }
  return false
}

/**
 * EN: Request optional host permission (call only from a user-gesture handler, e.g. dom -list Approve).
 * JA: オプション host 権限を要求（dom -list の許可ボタンなど、ユーザージェスチャ内でのみ呼ぶ）。
 */
export async function requestOptionalHttpHostAccess(): Promise<boolean> {
  try {
    const origins = [...OPTIONAL_HTTP_HOST_ORIGINS] as string[]
    if (await chrome.permissions.contains({ origins })) {
      return true
    }
    return await chrome.permissions.request({ origins })
  } catch {
    return false
  }
}

/** @deprecated Prefer `canScriptHttpHostPages` / `requestOptionalHttpHostAccess` explicitly. */
export async function ensureOptionalHttpHostAccess(): Promise<OptionalHostAccessResult> {
  if (await canScriptHttpHostPages()) {
    return "already"
  }
  return "denied"
}

/** @deprecated Use `optionalHostDeniedLines(locale)` — kept for eligibility first-line check. */
export const OPTIONAL_HOST_DENIED_LINES = optionalHostDeniedLines(DEFAULT_UI_LOCALE)
