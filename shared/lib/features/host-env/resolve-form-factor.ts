/**
 * EN: Form-factor axis — PC vs SP (smartphone).
 *     Sync path uses UA (and optional coarse-pointer fallback) so call sites stay sync.
 * JA: フォームファクタ軸（PC / SP）。同期呼び出し用に UA 等で判定する。
 */

export type HostFormFactor = "pc" | "sp"

/** EN: Coarse-pointer fallback when UA is unavailable (tests / odd hosts). */
export function detectCoarsePointerHost(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false
  }
  return window.matchMedia("(hover: none) and (pointer: coarse)").matches
}

/**
 * EN: Sync Android detect for shell-mode / capability dispatch.
 * JA: シェル／capability ディスパッチ用の同期 Android 判定。
 */
export function detectAndroidPlatformSync(): boolean {
  if (typeof navigator !== "undefined" && typeof navigator.userAgent === "string") {
    if (/Android/i.test(navigator.userAgent)) {
      return true
    }
  }
  return detectCoarsePointerHost()
}

/**
 * EN: Prefer `chrome.runtime.getPlatformInfo().os === "android"` when available.
 * JA: 可能なら Extensions API の `os === "android"` を正本とする。
 */
export async function detectAndroidPlatform(): Promise<boolean> {
  if (
    typeof chrome === "undefined" ||
    typeof chrome.runtime?.getPlatformInfo !== "function"
  ) {
    return detectAndroidPlatformSync()
  }
  try {
    const info = await chrome.runtime.getPlatformInfo()
    if (info.os === "android") {
      return true
    }
    return false
  } catch {
    return detectAndroidPlatformSync()
  }
}

export function resolveFormFactor(): HostFormFactor {
  return detectAndroidPlatformSync() ? "sp" : "pc"
}

export async function resolveFormFactorAsync(): Promise<HostFormFactor> {
  return (await detectAndroidPlatform()) ? "sp" : "pc"
}
