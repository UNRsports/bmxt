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
  ok: boolean
  code: SegmentOutcomeCode
  lines: string[]
  errorMessage?: string
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
}
