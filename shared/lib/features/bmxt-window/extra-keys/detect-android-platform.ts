/**
 * EN: Detect Android extension hosts for auto extra-keys visibility.
 * JA: ソフトキーバー自動表示用の Android ホスト判定。
 */

/** EN: Coarse-pointer fallback when getPlatformInfo is unavailable (tests / odd hosts). */
export function detectCoarsePointerHost(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false
  }
  return window.matchMedia("(hover: none) and (pointer: coarse)").matches
}

/**
 * EN: Prefer `chrome.runtime.getPlatformInfo().os === "android"` (Extensions API).
 * JA: Extensions API の `os === "android"` を正本とする。
 */
export async function detectAndroidPlatform(): Promise<boolean> {
  if (
    typeof chrome === "undefined" ||
    typeof chrome.runtime?.getPlatformInfo !== "function"
  ) {
    return detectCoarsePointerHost()
  }
  try {
    const info = await chrome.runtime.getPlatformInfo()
    if (info.os === "android") {
      return true
    }
    return false
  } catch {
    return detectCoarsePointerHost()
  }
}
