/**
 * EN: DataChannel wire limits for remote search (owned by search feature).
 * JA: リモート search 用 DataChannel ワイヤ上限（search 機能が所有）。
 */

/** EN: Soft UTF-8 cap for one DataChannel JSON message (tabs + search chunks). */
export const SEARCH_WIRE_SOFT_CAP_BYTES = 180_000

/** EN: Prefer smaller chunks than the soft cap for Firefox SCTP headroom. */
export const SEARCH_WIRE_CHUNK_TARGET_BYTES = 100_000

/** EN: Max hits streamed from one peer (matches local history API cap). */
export const SEARCH_REMOTE_MAX_HITS_PER_PEER = 10_000

/** EN: Title length on the wire. */
export const SEARCH_REMOTE_TITLE_MAX_CHARS = 200

/** EN: URL length on the wire. */
export const SEARCH_REMOTE_URL_MAX_CHARS = 500

/** EN: Do not send when DataChannel bufferedAmount exceeds this. */
export const SEARCH_WIRE_BUFFERED_AMOUNT_HIGH = 128_000
