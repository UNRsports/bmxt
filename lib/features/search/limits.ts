/**
 * EN: Caps for history/bookmark API rows. Page body is read live per tab (not SQLite-cached).
 * JA: 履歴／ブックマーク API の上限。ページ本文はタブごとに都度読み取り（SQLite キャッシュなし）。
 */

/** EN: Max chrome.history.search rows per find --history. JA: find --history の最大件数。 */
export const MAX_HISTORY_RESULTS = 10000

/** EN: How far back history.search spans (ms). JA: 履歴検索の遡及期間（ミリ秒）。 */
export const HISTORY_LOOKBACK_MS = 90 * 24 * 60 * 60 * 1000

/** EN: Max flattened bookmark rows. JA: ブックマーク走査の最大行数。 */
export const MAX_BOOKMARK_ROWS = 5000

/** EN: Max characters of innerText read per tab; 0 = no truncation. JA: タブ innerText 上限（0 は切り詰めなし）。 */
export const MAX_PAGE_TEXT_CHARS = 0
