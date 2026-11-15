export {
  linesForSearchElement,
  normalizeSearchPattern,
  type SearchScopeLabel
} from "./search-format"
export {
  HISTORY_LOOKBACK_DAYS,
  HISTORY_LOOKBACK_MS,
  HISTORY_PATTERN_START_TIME_MS,
  MAX_AGGREGATED_SEARCH_ENTRIES,
  MAX_BOOKMARK_ROWS,
  MAX_ENRICH_OPEN_TAB_ENTRIES,
  MAX_HISTORY_RESULTS,
  MAX_MATCHES_PER_TAB,
  MAX_PAGE_TEXT_CHARS,
  PAGE_SCAN_PREFIX_CHARS,
  MAX_SEARCH_LINES_OUT,
  MAX_SERIALIZED_PAGE_MATCHES
} from "./limits"
export {
  filterSearchPickerEntries
} from "./peer/filter-search-picker-entries"
export {
  clipRemoteSearchHits,
  packRemoteSearchHitsIntoChunks,
  shrinkHitsForSearchWire
} from "./peer/remote-search-hit-pack"
export {
  SEARCH_REMOTE_MAX_HITS_PER_PEER,
  SEARCH_WIRE_CHUNK_TARGET_BYTES,
  SEARCH_WIRE_SOFT_CAP_BYTES
} from "./peer/remote-search-wire-limits"
export {
  matchesNeedle,
  normalizeForMatch,
  stripInvisibleFormatChars
} from "./matcher"
