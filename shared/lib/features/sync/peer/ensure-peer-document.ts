/**
 * EN: Sync peer host is the BMXt prompt document only.
 *     Do not open offscreen documents or dedicated peer tabs.
 * JA: sync の peer 宿主はプロンプト窓（bmxt.html）のみ。
 *     offscreen / 専用 peer タブは開かない。
 */

/**
 * EN: Verify this JS realm can own RTCPeerConnection (prompt / float page).
 *     No side effects — background hosts are intentionally not created.
 * JA: この JS レルムが RTCPeerConnection を持てるか確認するだけ。
 *     副作用なし（バックグラウンド宿主は作らない）。
 */
export async function ensurePeerDocument(): Promise<void> {
  if (typeof RTCPeerConnection === "undefined") {
    throw new Error(
      "RTCPeerConnection unavailable — Family sync tunnel must run in the BMXt prompt window"
    )
  }
}
