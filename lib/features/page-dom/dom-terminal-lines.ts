/**
 * EN: Shared formatter that wraps `bmxtDomShowInjected` body into terminal-friendly lines.
 * JA: `bmxtDomShowInjected` の body をターミナル行に分割する共有フォーマッタ。
 *     表示層のスクロールとサマリー行で閲覧する（データ取得層では打ち切らない）。
 */

export function bodyToTerminalLines(body: string): string[] {
  if (body.length === 0) {
    return []
  }
  return body.split(/\r?\n/)
}
