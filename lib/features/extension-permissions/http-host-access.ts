/**
 * EN: Mirrors required `host_permissions` http(s) patterns in `wxt.config.ts` — keep origins in sync.
 *     Access is granted at install; these helpers cover chrome://extensions site-access Off.
 * JA: `wxt.config.ts` の必須 host_permissions（http/https）と同一パターンに保つこと。
 *     インストール時に付与されるが、サイトアクセス Off の稀ケース用に残す。
 */

import { readTabInnerText } from "../page-extract/read-tab-inner-text"
import { httpHostDeniedLines } from "../setting/i18n"
import { UI_LOCALE_IDS, type UiLocale } from "../setting/locale"
import { isHttpUrl } from "../url/is-http-url"

export const HTTP_HOST_ORIGINS = ["http://*/*", "https://*/*"] as const

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
 * EN: True when http(s) tab text can be read (required host_permissions and/or live CS).
 * JA: http(s) タブの本文を取得できるか（必須 host または常駐 CS）。
 */
export async function canScriptHttpHostPages(): Promise<boolean> {
  try {
    const origins = [...HTTP_HOST_ORIGINS] as string[]
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
 * EN: First denied-error line for every UI locale (eligibility match after locale-aware emit).
 * JA: 拒否メッセージ先頭行（全ロケール）— 出力照合用。
 */
export function httpHostDeniedErrorLines(): string[] {
  return UI_LOCALE_IDS.map((locale: UiLocale) => httpHostDeniedLines(locale)[0] ?? "")
}
