import type { CommandDispatchDeps } from "../bmxt-window/shell/command-dispatch/types.ts"
import {
  fetchListResultForCommand,
  matchPlainListCommand
} from "../command-line/list-commands/index.ts"
import {
  segmentFailure,
  segmentSuccess
} from "../command-line/compound/classify-outcome.ts"
import type { SegmentOutcome } from "../command-line/compound/types.ts"
import { tCmd } from "../setting/i18n/ns/cmd.ts"
import { tError } from "../setting/i18n/ns/error.ts"
import type { UiLocale } from "../setting/locale.ts"
import { parsePickerPrefixLine } from "./match.ts"
import { openPickerFromListResult } from "./open-from-list-result.ts"
import { browseUsageLines } from "./usage.ts"

function showUrlFromTabsMatch(match: unknown): boolean {
  if (match === null || typeof match !== "object") {
    return false
  }
  const record = match as { showUrl?: unknown }
  return record.showUrl === true
}

/**
 * EN: Run prefix-form `browse` / `browse <list-command>`.
 * JA: プレフィックス形式の `browse` / `browse <list-command>` を実行する。
 */
export async function runBrowseCommand(
  segment: string,
  deps: CommandDispatchDeps,
  locale: UiLocale
): Promise<SegmentOutcome | null> {
  const parsed = parsePickerPrefixLine(segment)
  if (parsed === null) {
    return null
  }

  if (parsed.kind === "usage") {
    return segmentSuccess(browseUsageLines(locale))
  }

  const matched = matchPlainListCommand(parsed.producerSegment)
  if (matched === null) {
    return segmentFailure("usage", [
      tCmd("cmd.browse.error.notListProducer", locale, {
        segment: parsed.producerSegment
      }),
      ...browseUsageLines(locale)
    ])
  }

  try {
    const listResult = await fetchListResultForCommand(matched, { locale, deps })
    const showUrl =
      matched.entry.id === "tabs" ? showUrlFromTabsMatch(matched.match) : false
    return openPickerFromListResult(listResult, { showUrl }, deps, locale)
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return segmentFailure("runtime", [tError("error.generic", locale, { message })], message)
  }
}
