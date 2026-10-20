import type { BmxtRuleStream } from "../../../bmxt-rule/types.ts"
import type { CommandDispatchDeps } from "../../../bmxt-window/shell/command-dispatch/types.ts"
import type { UiLocale } from "../../../setting/locale.ts"
import { openPickerFromListResult } from "../../../picker/open-from-list-result.ts"
import { segmentFailure } from "../../compound/classify-outcome.ts"
import type { SegmentOutcome } from "../../compound/types.ts"
import { tPipe } from "../../../setting/i18n/ns/pipe.ts"
import { BROWSE_ACCEPTS_BMXT_RULE_KINDS, isBrowsePipeConsumer } from "./browse-match.ts"
import type { PipeConsumerEntry, PipeConsumerRunContext } from "./types.ts"

export { isBrowsePipeConsumer, BROWSE_ACCEPTS_BMXT_RULE_KINDS } from "./browse-match.ts"

export async function runBrowseFromListResult(
  _stream: BmxtRuleStream,
  deps: CommandDispatchDeps,
  locale: UiLocale,
  context: PipeConsumerRunContext
): Promise<SegmentOutcome> {
  const listResult = context.listResult
  if (listResult === undefined) {
    return segmentFailure("runtime", [tPipe("pipe.browse.noListResult", locale)])
  }
  return openPickerFromListResult(listResult, { showUrl: context.showUrl }, deps, locale)
}

export const browsePipeConsumer: PipeConsumerEntry = {
  id: "browse",
  match: isBrowsePipeConsumer,
  acceptsKinds: BROWSE_ACCEPTS_BMXT_RULE_KINDS,
  run: (stream, deps, locale, _segment, context) =>
    runBrowseFromListResult(stream, deps, locale, context)
}
