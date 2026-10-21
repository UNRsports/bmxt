/**
 * EN: True for ordinary web page URLs (http or https).
 *     Used when opening / listing / matching tabs, history, and bookmarks.
 *     In-page scripting (CS inject, dom, search --page, nav, float, snapshot save)
 *     uses `isScriptablePageUrl` (https only) instead.
 * JA: 通常の Web URL（http / https）。タブを開く・履歴・ブックマーク照合用。
 *     ページ内操作は `isScriptablePageUrl`（https のみ）を使う。
 */
export function isHttpUrl(url: string | undefined): boolean {
  if (!url) {
    return false
  }
  return url.startsWith("http://") || url.startsWith("https://")
}
