/**
 * EN: Reads chrome.history in memory only; nothing is written to extension storage.
 * JA: chrome.history をメモリ上のみ参照。拡張の storage には書き込みません。
 */

import { formatGrepLine, matchesNeedle, HISTORY_LOOKBACK_MS, MAX_HISTORY_RESULTS } from "../search"

export async function grepHistoryLines(pattern: string): Promise<string[]> {
  const items = await chrome.history.search({
    text: "",
    maxResults: MAX_HISTORY_RESULTS,
    startTime: Date.now() - HISTORY_LOOKBACK_MS
  })
  const matches: string[] = []
  for (const it of items) {
    const title = it.title ?? ""
    const url = it.url ?? ""
    const blob = `${title} ${url}`
    if (!matchesNeedle(blob, pattern)) {
      continue
    }
    matches.push(formatGrepLine("history", url || "(no url)", title || "(no title)"))
  }
  if (matches.length === 0) {
    return ["(no history matches — pattern is case-insensitive substring)"]
  }
  return [
    `(${matches.length} match(es) from recent history, capped at ${MAX_HISTORY_RESULTS} rows)`,
    ...matches
  ]
}
