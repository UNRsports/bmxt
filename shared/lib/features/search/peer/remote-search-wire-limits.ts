/**
 * EN: DataChannel wire limits for remote search (owned by search feature).
 * JA: リモート search 用 DataChannel ワイヤ上限（search 機能が所有）。
 */

/** EN: Soft UTF-8 cap for one DataChannel JSON message (tabs + search chunks). */
export const SEARCH_WIRE_SOFT_CAP_BYTES = 180_000

/**
 * EN: Prefer smaller chunks than the soft cap for Firefox SCTP headroom.
 *     Kept modest so history browse streams many small pieces instead of one huge blob.
 * JA: Firefox SCTP 余裕のため soft cap より小さく。履歴 browse は巨大1通ではなく細切れ送信。
 */
export const SEARCH_WIRE_CHUNK_TARGET_BYTES = 40_000

/**
 * EN: Max hits streamed from one peer.
 *     Lower than local history API (10k) so DataChannel send budget is not exhausted
 *     when CLI/extension browse empty-pattern history over the wire.
 * JA: ピアあたりのストリーム上限。ローカル履歴 API（1万）より低くし、
 *     キーワードなし履歴 browse で DataChannel 送信予算を枯らさない。
 */
export const SEARCH_REMOTE_MAX_HITS_PER_PEER = 400

/** EN: Title length on the wire. */
export const SEARCH_REMOTE_TITLE_MAX_CHARS = 200

/** EN: URL length on the wire. */
export const SEARCH_REMOTE_URL_MAX_CHARS = 500

/** EN: Do not send when DataChannel bufferedAmount exceeds this. */
export const SEARCH_WIRE_BUFFERED_AMOUNT_HIGH = 128_000
