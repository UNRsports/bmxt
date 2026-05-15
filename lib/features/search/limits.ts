/**
 * EN: Hard caps for in-memory find / page scans (no persistence; limits memory + terminal spam).
 * JA: メモリ内 find / ページ走査の上限（永続化なし。メモリ・ログ量の抑制）。
 */

/** EN: Max chrome.history.search rows per find --history. JA: find --history の最大件数。 */
export const MAX_HISTORY_RESULTS = 10000

/** EN: How far back history.search spans (ms). JA: 履歴検索の遡及期間（ミリ秒）。 */
export const HISTORY_LOOKBACK_MS = 90 * 24 * 60 * 60 * 1000

/** EN: Max flattened bookmark rows. JA: ブックマーク走査の最大行数。 */
export const MAX_BOOKMARK_ROWS = 5000

/** EN: Max http(s) tabs scanned for find --page (discarded tabs skipped elsewhere). JA: find --page で走査するタブ数上限。 */
export const MAX_PAGE_TABS = 120

/** EN: Max characters of innerText read per tab. JA: タブあたり innerText の最大文字数。 */
export const MAX_PAGE_TEXT_CHARS = 80_000
