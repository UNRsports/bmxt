/**
 * EN: Extract peer-failure tokens from ListResult.meta.syncNotices (no i18n).
 * JA: ListResult.meta.syncNotices からピア失敗トークンを抽出する（i18n なし）。
 */

import type { ListResult } from "../../command-line/list-output/types.ts"

function isPeerFailureToken(token: string): boolean {
  return token === "sync.list.noConnectedPeers" || token.startsWith("sync.list.peerFailed:")
}

/**
 * EN: Tokens that describe non-responding / failed peers (for footer / picker banner).
 * JA: 無応答・失敗ピア向けトークン（フッタ／ピッカーバナー用）。
 */
export function peerFailureTokensFromListResult(result: ListResult): string[] {
  const raw = result.meta?.syncNotices
  if (raw === undefined || raw.trim().length === 0) {
    return []
  }
  return raw
    .split("\n")
    .map((token) => token.trim())
    .filter((token) => token.length > 0 && isPeerFailureToken(token))
}
