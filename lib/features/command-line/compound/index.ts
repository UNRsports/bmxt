export type {
  CompoundRunResult,
  CompoundSegmentResult,
  ParseAndSegmentsResult,
  SegmentOutcome,
  SegmentOutcomeCode
} from "./types.ts"
export { lineHasAndOperator, parseAndSegments } from "./parse-and-segments.ts"
export { lineHasPipeOperator, parsePipeSegments } from "./parse-pipe-segments.ts"
export { lineHasCompoundOperator } from "./line-has-compound-operator.ts"
export {
  isCompoundPromptLine,
  mapSegmentOffsetToLine,
  resolveActiveCommandSegment,
  scanCompoundSegmentSpans,
  type ActiveCommandSegment,
  type CompoundSegmentSpan
} from "./active-segment.ts"
export { classifyCompoundEligibility } from "./classify-eligibility.ts"
export { classifyOutcomeFromLines } from "./classify-outcome.ts"
export { runCompoundLine } from "./run-compound-line.ts"
export { runSegment } from "./run-segment.ts"
