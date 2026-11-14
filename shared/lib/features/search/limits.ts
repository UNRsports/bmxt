/**
 * EN: Caps for history/bookmark API rows. Page body is read live per tab (not SQLite-cached).
 * JA: 履歴／ブックマーク API の上限。ページ本文はタブごとに都度読み取り（SQLite キャッシュなし）。
 */

/** EN: Max chrome.history.search rows per find --history. JA: find --history の最大件数。 */
export const MAX_HISTORY_RESULTS = 10000

/**
 * EN: Lookback when listing history without a keyword (browse-all).
 * JA: キーワードなしで履歴を一覧するときの遡及期間。
 */
export const HISTORY_LOOKBACK_MS = 90 * 24 * 60 * 60 * 1000

/** EN: Calendar days matching `HISTORY_LOOKBACK_MS` (for notices). */
export const HISTORY_LOOKBACK_DAYS = 90

/**
 * EN: `chrome.history.search` startTime for keyword queries (0 = all available history).
 * JA: キーワード検索時の startTime（0 = ブラウザが持つ全履歴）。
 */
export const HISTORY_PATTERN_START_TIME_MS = 0

/** EN: Max flattened bookmark rows. JA: ブックマーク走査の最大行数。 */
export const MAX_BOOKMARK_ROWS = 5000

/** EN: Max characters of innerText read per tab; 0 = no truncation. JA: タブ innerText 上限（0 は切り詰めなし）。 */
export const MAX_PAGE_TEXT_CHARS = 500_000

/**
 * EN: Prefix length when a page exceeds `MAX_PAGE_TEXT_CHARS` (or enrich timed reads).
 *     Keeps tab budgets / executeScript timeouts from dropping all body hits.
 * JA: `MAX_PAGE_TEXT_CHARS` 超（または enrich の時間制約）時に走査する先頭長。
 */
export const PAGE_SCAN_PREFIX_CHARS = 120_000

/** EN: Max page-body match objects kept per tab. JA: タブあたり本文マッチ上限。 */
export const MAX_MATCHES_PER_TAB = 500

/** EN: Max matches embedded in ListResult pageMatchesJson. JA: ListResult に載せるマッチ上限。 */
export const MAX_SERIALIZED_PAGE_MATCHES = 200

/** EN: Max plain lines accumulated across search scopes. JA: 全スコープ合計の行バッファ上限。 */
export const MAX_SEARCH_LINES_OUT = 60_000

/**
 * EN: Fair per-scope share of `MAX_SEARCH_LINES_OUT` so history cannot drop page hits.
 * JA: 履歴がページヒットを押し出さないよう、スコープごとの公平枠。
 */
export function maxSearchLinesPerScope(scopeCount: number): number {
  const n = Math.max(1, scopeCount)
  return Math.max(4_000, Math.floor(MAX_SEARCH_LINES_OUT / n))
}

/** EN: Max history/bookmark entries enriched from open tabs. JA: 開タブ本文で enrich する最大件数。 */
export const MAX_ENRICH_OPEN_TAB_ENTRIES = 50

/**
 * EN: Max search hits kept after merging local + all peers (memory / picker bound).
 * JA: ローカル＋全ピア合流後の検索ヒット上限（メモリ／picker 境界）。
 */
export const MAX_AGGREGATED_SEARCH_ENTRIES = 50_000
