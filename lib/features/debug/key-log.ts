/**
 * BMXt 専用タブの DevTools コンソール用キーボードデバッグ。
 *
 * 有効化: そのタブのコンソールで
 *   localStorage.setItem("bmxt_debug_keys", "1")
 * 無効化:
 *   localStorage.removeItem("bmxt_debug_keys")
 * （または "0" をセット）
 */

const STORAGE_KEY = "bmxt_debug_keys"

export function isBmxtKeyDebugEnabled(): boolean {
  if (typeof window === "undefined") {
    return false
  }
  try {
    return window.localStorage?.getItem(STORAGE_KEY) === "1"
  } catch {
    return false
  }
}

export function logBmxtKey(
  scope: "prompt" | "picker",
  message: string,
  detail?: Record<string, unknown>
): void {
  if (!isBmxtKeyDebugEnabled()) {
    return
  }
  const prefix = `[bmxt:key:${scope}]`
  if (detail !== undefined && Object.keys(detail).length > 0) {
    console.debug(prefix, message, detail)
  } else {
    console.debug(prefix, message)
  }
}
