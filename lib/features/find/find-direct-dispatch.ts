/**
 * EN: `find --page` / `find --none` / … — run in the BMXt window (not SW `RUN_CMD`).
 * JA: ページ横断 find は BMXt ウィンドウ内で実行（SW 経由だと応答が遅延・無応答になりうる）。
 */

const FIND_DIRECT_SCOPES = new Set(["--none", "--history", "--bookmark", "--page"])

export function parseFindDirectDispatchLine(trimmed: string): string | null {
  const parts = trimmed.trim().split(/\s+/).filter((s) => s.length > 0)
  if (parts.length < 2 || parts[0]!.toLowerCase() !== "find") {
    return null
  }
  const head = parts[1]!.toLowerCase()
  if (!FIND_DIRECT_SCOPES.has(head)) {
    return null
  }
  return trimmed.trim()
}
