/**
 * EN: Sync tunnel hold / CLI door retry intervals (UiSettings).
 * JA: Sync トンネル hold / CLI door リトライ間隔（UiSettings）。
 */

/** EN: Default hold tick (was 4000). Longer to reduce worker churn. */
export const DEFAULT_SYNC_HOLD_INTERVAL_MS = 20_000

/** EN: Default CLI door retry gap (was 4000). Offset from hold default. */
export const DEFAULT_CLI_DOOR_RETRY_MS = 12_000

export const MIN_SYNC_TIMING_MS = 2_000
export const MAX_SYNC_TIMING_MS = 300_000

/** EN: Clamp a millisecond interval into the supported range. */
export function normalizeSyncTimingMs(raw: unknown, fallback: number): number {
  if (typeof raw !== "number" || !Number.isFinite(raw)) {
    return fallback
  }
  const rounded = Math.round(raw)
  if (rounded < MIN_SYNC_TIMING_MS) {
    return MIN_SYNC_TIMING_MS
  }
  if (rounded > MAX_SYNC_TIMING_MS) {
    return MAX_SYNC_TIMING_MS
  }
  return rounded
}

/**
 * EN: Parse `setting -set` timing value.
 *     `"default"` / `"reset"` → use caller default; invalid → null.
 */
export function parseSyncTimingMsToken(
  value: string
): number | "default" | null {
  const trimmed = value.trim().toLowerCase()
  if (trimmed === "default" || trimmed === "reset") {
    return "default"
  }
  if (!/^\d+$/.test(trimmed)) {
    return null
  }
  const n = Number.parseInt(trimmed, 10)
  if (!Number.isFinite(n)) {
    return null
  }
  return normalizeSyncTimingMs(n, n)
}
