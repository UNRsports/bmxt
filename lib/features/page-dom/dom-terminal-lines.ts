/**
 * EN: Shared formatter that wraps `bmxtDomShowInjected` body into terminal-friendly lines.
 *     Used by both `applyDomShowEffect` (log dump) and `applyDomListEffect` (picker rows).
 * JA: `bmxtDomShowInjected` の body をターミナル行に分割する共有フォーマッタ。
 *     `dom -show`（ログ出力）と `dom -list`（picker 行）の双方で使う。
 */

const MAX_TERMINAL_LINES = 900
const MAX_LINE_CHARS = 400

export function bodyToTerminalLines(body: string): string[] {
  const raw = body.split(/\r?\n/)
  const out: string[] = []
  for (const ln of raw) {
    if (ln.length <= MAX_LINE_CHARS) {
      out.push(ln)
    } else {
      for (let i = 0; i < ln.length; i += MAX_LINE_CHARS) {
        out.push(ln.slice(i, i + MAX_LINE_CHARS))
      }
    }
    if (out.length >= MAX_TERMINAL_LINES) {
      out.push("…(output truncated for terminal; reload page is unchanged)")
      break
    }
  }
  return out
}
