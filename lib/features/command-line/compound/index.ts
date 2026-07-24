export type {
  CompoundRunResult,
  CompoundSegmentResult,
  ParseAndSegmentsResult,
  SegmentOutcome,
  SegmentOutcomeCode
} from "./types.ts"
export {
  EXIT_FAILURE,
  EXIT_MISUSE,
  EXIT_NOT_FOUND,
  EXIT_SUCCESS,
  compoundShouldStop,
  exitStatusForCode,
  isExitSuccess,
  shouldRunAfterOperator
} from "./exit-status.ts"
export { lineHasAndOperator, parseAndSegments } from "./parse-and-segments.ts"
export {
  lineHasListOperator,
  parseCompoundSegments,
  type CompoundOperator,
  type ParseCompoundSegmentsResult
} from "./parse-compound-segments.ts"
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
export {
  classifyOutcomeFromLines,
  segmentFailure,
  segmentSuccess,
  withMergedLines
} from "./classify-outcome.ts"
export { runCompoundLine } from "./run-compound-line.ts"
export { runSegment } from "./run-segment.ts"
