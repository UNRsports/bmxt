/** chrome.runtime.onInstalled の reason（テスト用に文字列でも可）。 */
export type WelcomeInstallReason = "install" | "update" | "chrome_update"

/**
 * 拡張機能のバージョンアップ後にウェルカムタブを自動で開くべきか。
 * 初回インストール・Chrome 本体更新・同一版の再読み込みでは false。
 */
export function shouldOpenWelcomePageOnUpdate(
  reason: WelcomeInstallReason,
  manifestVersion: string,
  lastSeenWelcomeVersion: string | undefined
): boolean {
  if (reason !== "update") {
    return false
  }
  if (lastSeenWelcomeVersion === manifestVersion) {
    return false
  }
  return true
}
