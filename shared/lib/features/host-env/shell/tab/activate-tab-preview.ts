/**
 * EN: Tab shell (Firefox SP) — never activate another tab (would hide BMXt).
 * JA: タブシェル（Firefox SP）— 別タブを active にしない（BMXt が隠れる）。
 */

export async function activateTabInBackground(_tabId: number): Promise<boolean> {
  return false
}
