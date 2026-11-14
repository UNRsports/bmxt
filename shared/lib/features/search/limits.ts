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

/** EN: Max page-body match objects kept per tab. JA: タブあたり本文マッチ上限。 */
export const MAX_MATCHES_PER_TAB = 500

/** EN: Max matches embedded in ListResult pageMatchesJson. JA: ListResult に載せるマッチ上限。 */
export const MAX_SERIALIZED_PAGE_MATCHES = 200

/** EN: Max plain lines accumulated across search scopes. JA: 全スコープ合計の行バッファ上限。 */
export const MAX_SEARCH_LINES_OUT = 60_000

/** EN: Max history/bookmark entries enriched from open tabs. JA: 開タブ本文で enrich する最大件数。 */
export const MAX_ENRICH_OPEN_TAB_ENTRIES = 50

/**
 * EN: Max search hits kept after merging local + all peers (memory / picker bound).
 * JA: ローカル＋全ピア合流後の検索ヒット上限（メモリ／picker 境界）。
 */
export const MAX_AGGREGATED_SEARCH_ENTRIES = 50_000
