/**
 * EN: Expand ListResult.meta.syncNotices into a trailing peer-failure footer.
 * JA: ListResult.meta.syncNotices を末尾の無応答ピア・フッタへ展開する。
 */

import type { UiLocale } from "../../setting/locale.ts"
import type { ListResult } from "../../command-line/list-output/types.ts"
import { expandSyncLogLines } from "../facade/expand-sync-log.ts"
import { peerFailureTokensFromListResult } from "./peer-failure-tokens.ts"

export { peerFailureTokensFromListResult } from "./peer-failure-tokens.ts"

function toFooterExpandToken(token: string): string {
  if (token.startsWith("sync.list.peerFailed:")) {
    return `sync.list.peerFailedFooterItem:${token.slice("sync.list.peerFailed:".length)}`
  }
  return token
}

/** EN: Human lines for peer failures (intro + items). Empty when none failed. */
export function formatPeerFailureFooterLines(
  result: ListResult,
  locale: UiLocale
): string[] {
  const tokens = peerFailureTokensFromListResult(result)
  if (tokens.length === 0) {
    return []
  }
  const footerTokens = [
    "sync.list.peerFailedFooterIntro",
    ...tokens.map((token) => toFooterExpandToken(token))
  ]
  return expandSyncLogLines(footerTokens, locale)
}

/** EN: Alias kept for call sites that prefer meta-aware naming. */
export function formatPeerFailureFooterLinesPreferMeta(
  result: ListResult,
  locale: UiLocale
): string[] {
  return formatPeerFailureFooterLines(result, locale)
}
