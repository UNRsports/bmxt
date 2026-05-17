import { OPTIONAL_HOST_DENIED_LINES } from "../extension-permissions/optional-http-hosts"

/**
 * EN: True only when optional http(s) host permission was denied — show approve UI.
 * JA: オプション host 権限拒否時のみ許可プロンプトを出す。
 */
export function isDomListPermissionPromptOutput(lines: string[]): boolean {
  return (lines[0] ?? "") === OPTIONAL_HOST_DENIED_LINES[0]
}
