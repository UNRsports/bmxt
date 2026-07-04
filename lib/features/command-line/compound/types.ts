export type SegmentOutcomeCode =
  | "ok"
  | "usage"
  | "unknown"
  | "runtime"
  | "continuation"
  | "interactive"
  | "parse"
  | "cancelled"

export type SegmentOutcome = {
  /** EN: Convenience flag; always `exitStatus === 0`. */
  ok: boolean
  /** EN: Internal classification (usage / unknown / …). */
  code: SegmentOutcomeCode
  /** EN: Numeric exit status (0 = success). See `exit-status.ts`. */
  exitStatus: number
  /** EN: Standard output lines (success listings, status messages). */
  stdout: string[]
  /** EN: Standard error lines (usage, parse, runtime errors). */
  stderr: string[]
  /**
   * EN: Display projection — `stdout` then `stderr`.
   * Prefer `stdout` / `stderr` when channel matters.
   */
  lines: string[]
  errorMessage?: string
  /** EN: Structured `-list` output passed to a pipe consumer. */
  listResult?: import("../list-output/types.ts").ListResult
}

export type ParseAndSegmentsResult =
  | { ok: true; segments: string[] }
  | { ok: false; error: "unclosed_quote" | "dangling_operator" | "empty_segment" }

export type CompoundSegmentResult = {
  index: number
  text: string
  outcome: SegmentOutcome
  skipped: boolean
}

export type CompoundRunResult = {
  inputLine: string
  segments: CompoundSegmentResult[]
  stoppedAt: number | null
  /** EN: Overall exit status (failed segment, or last success, or parse misuse). */
  exitStatus: number
}
