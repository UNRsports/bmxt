/** chrome.runtime.onInstalled の reason（テスト用に文字列でも可）。 */
export type WelcomeInstallReason = "install" | "update" | "chrome_update"

/**
 * インストールまたは拡張機能更新時にウェルカムタブを自動で開くべきか。
 * Chrome 本体更新・同一版の再表示済みでは false。
 */
export function shouldOpenWelcomePageOnUpdate(
  reason: WelcomeInstallReason,
  manifestVersion: string,
  lastSeenWelcomeVersion: string | undefined
): boolean {
  if (reason !== "install" && reason !== "update") {
    return false
  }
  if (lastSeenWelcomeVersion === manifestVersion) {
    return false
  }
  return true
}
