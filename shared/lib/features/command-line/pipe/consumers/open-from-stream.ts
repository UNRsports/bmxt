import type { BmxtRuleStream } from "../../../bmxt-rule/types.ts"
import type { CommandDispatchDeps } from "../../../bmxt-window/shell/command-dispatch/types.ts"
import type { UiLocale } from "../../../setting/locale.ts"
import { applyHostEffects } from "../../../dispatch/apply-effects.ts"
import type { HostEffect } from "../../../dispatch/effect-types.ts"
import { normalizePickerOpenUrl } from "../../../side-picker/model/normalize-picker-open-url.ts"
import {
  segmentFailure,
  segmentSuccess
} from "../../compound/classify-outcome.ts"
import type { SegmentOutcome } from "../../compound/types.ts"
import { tPipe } from "../../../setting/i18n/ns/pipe.ts"
import {
  isOpenPipeConsumer,
  OPEN_ACCEPTS_BMXT_RULE_KINDS,
  parseOpenPipeSegment
} from "./open-match.ts"
import type { PipeConsumerEntry } from "./types.ts"

export { isOpenPipeConsumer, OPEN_ACCEPTS_BMXT_RULE_KINDS } from "./open-match.ts"

function urlsFromBmxtRuleStream(stream: BmxtRuleStream): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const record of stream.records) {
    for (const [key, value] of record.entries) {
      if (key !== "url" || typeof value !== "string") {
        continue
      }
      const url = normalizePickerOpenUrl(value)
      if (url === undefined || seen.has(url)) {
        continue
      }
      seen.add(url)
      out.push(url)
    }
  }
  return out
}

export async function runOpenFromBmxtRuleStream(
  stream: BmxtRuleStream,
  deps: CommandDispatchDeps,
  locale: UiLocale,
  segment: string
): Promise<SegmentOutcome> {
  const flags = parseOpenPipeSegment(segment)
  if (flags === null) {
    return segmentFailure("runtime", [
      tPipe("pipe.error.unsupportedConsumer", locale, { stage: segment })
    ])
  }
  const urls = urlsFromBmxtRuleStream(stream)
  if (urls.length === 0) {
    return segmentFailure("runtime", [tPipe("pipe.open.noUrls", locale)])
  }

  const effects: HostEffect[] = urls.map((url) =>
    flags.window
      ? ({ kind: "open_url_new_window", url } as const)
      : ({ kind: "open_url_new_tab", url } as const)
  )

  try {
    const logLines = await applyHostEffects(
      {
        enqueueSessionPatch: () => {},
        clearLog: async () => {},
        exitPane: async () => [],
        listWindows: async () => [],
        focusInfo: async () => [],
        resolveTabArg: async () => undefined,
        commandSessionId: deps.sessionId,
        uiLocale: locale
      },
      effects
    )
    return segmentSuccess(logLines)
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return segmentFailure("runtime", [`error: ${message}`])
  }
}

export const openPipeConsumer: PipeConsumerEntry = {
  id: "open",
  match: isOpenPipeConsumer,
  acceptsKinds: OPEN_ACCEPTS_BMXT_RULE_KINDS,
  run: (stream, deps, locale, segment, _context) =>
    runOpenFromBmxtRuleStream(stream, deps, locale, segment)
}
