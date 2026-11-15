/** EN: Cap remote list payloads to stay under DataChannel message size (~200KB). */

export const SYNC_REMOTE_TABS_MAX_ROWS = 400
/**
 * EN: Max hits reassembled from one peer stream (aligned with history API / search peer pack).
 * JA: 1 ピアのストリーム再組立上限（history API／search peer pack と揃える）。
 */
export const SYNC_REMOTE_SEARCH_MAX_HITS = 10_000
export const SYNC_REMOTE_QUERY_TIMEOUT_MS = 20_000

/** EN: Re-export search-owned wire soft cap for tabs/search shared send path. */
export { SEARCH_WIRE_SOFT_CAP_BYTES as WIRE_SOFT_CAP_BYTES } from "../../search/peer/remote-search-wire-limits.ts"
