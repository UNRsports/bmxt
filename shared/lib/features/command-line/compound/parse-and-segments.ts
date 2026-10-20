import {
  lineHasListOperator,
  parseCompoundSegments
} from "./parse-compound-segments.ts"
import type { ParseAndSegmentsResult } from "./types.ts"

/** EN: True when the line contains a top-level list operator (`&&` / `||` / `;`). */
export function lineHasAndOperator(line: string): boolean {
  return lineHasListOperator(line)
}

/**
 * EN: Split on `&&` / `||` / `;` (see `parseCompoundSegments`).
 * Operators between segments are available via `parseCompoundSegments`.
 */
export function parseAndSegments(line: string): ParseAndSegmentsResult {
  const parsed = parseCompoundSegments(line)
  if (parsed.ok === false) {
    return parsed
  }
  return { ok: true, segments: parsed.segments }
}
