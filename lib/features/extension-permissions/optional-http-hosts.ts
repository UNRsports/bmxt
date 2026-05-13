/**
 * EN: Mirrors `optional_host_permissions` in `package.json` — keep origins in sync.
 * JA: `package.json` の optional_host_permissions と同一パターンに保つこと。
 */
export const OPTIONAL_HTTP_HOST_ORIGINS = ["http://*/*", "https://*/*"] as const

export type OptionalHostAccessResult = "granted" | "denied" | "already"

export async function ensureOptionalHttpHostAccess(): Promise<OptionalHostAccessResult> {
  try {
    const origins = [...OPTIONAL_HTTP_HOST_ORIGINS] as string[]
    const has = await chrome.permissions.contains({ origins })
    if (has) {
      return "already"
    }
    const ok = await chrome.permissions.request({ origins })
    return ok ? "granted" : "denied"
  } catch {
    return "denied"
  }
}

export const OPTIONAL_HOST_DENIED_LINES = [
  "error: http(s) site access was not granted (optional host permission).",
  "EN: Approve access when prompted, or enable site access for BMXt under chrome://extensions → Details.",
  "JA: 表示されたダイアログで許可するか、chrome://extensions の詳細でサイトへのアクセスを有効にしてから再度実行してください。"
] as const
