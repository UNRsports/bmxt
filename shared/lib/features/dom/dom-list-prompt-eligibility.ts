import { httpHostDeniedErrorLines } from "../extension-permissions/http-host-access"

/**
 * EN: True when output is the http(s) site-access-denied notice — show retry UI.
 * JA: http(s) サイトアクセス拒否の通知出力のとき再試行 UI を出す。
 */
export function isDomListPermissionPromptOutput(lines: string[]): boolean {
  const first = lines[0] ?? ""
  if (first.length === 0) {
    return false
  }
  return httpHostDeniedErrorLines().includes(first)
}
