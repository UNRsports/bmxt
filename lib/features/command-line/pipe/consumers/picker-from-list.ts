import type { ListResult } from "../../list-output/types.ts"
import type { ListRecordKind } from "../../list-output/types.ts"
import type { CommandDispatchDeps } from "../../../bmxt-window/shell/command-dispatch/types.ts"
import type { UiLocale } from "../../../setting/locale.ts"
import type { SegmentOutcome } from "../../compound/types.ts"
import { segmentFailure } from "../../compound/classify-outcome.ts"
import {
  isPickerCommandSegment,
  parsePickerConsumerSegment
} from "../../../picker/match.ts"
import type { PipeConsumerEntry } from "./types.ts"

/** EN: All list-record kinds the `picker` consumer may receive. */
export const PICKER_ACCEPTS_KINDS: readonly ListRecordKind[] = [
  "tabs.window",
  "tabs.group",
  "tabs.tab",
  "search.hit",
  "dom.node",
  "dom.notice",
  "session.row",
  "setting.field"
]

export function isPickerPipeConsumer(segment: string): boolean {
  return isPickerCommandSegment(segment)
}

export async function runPickerFromListResult(
  listResult: ListResult,
  deps: CommandDispatchDeps,
  locale: UiLocale,
  segment: string
): Promise<SegmentOutcome> {
  const options = parsePickerConsumerSegment(segment)
  if (options === null) {
    return segmentFailure("parse", [])
  }
  const { openPickerFromListResult } = await import("../../../picker/open-from-list-result.ts")
  return openPickerFromListResult(listResult, options, deps, locale)
}

export const pickerPipeConsumer: PipeConsumerEntry = {
  id: "picker",
  match: isPickerPipeConsumer,
  acceptsKinds: PICKER_ACCEPTS_KINDS,
  run: runPickerFromListResult
}
