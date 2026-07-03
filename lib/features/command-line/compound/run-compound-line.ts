import type { CommandDispatchDeps } from "../../bmxt-window/shell/command-dispatch/types.ts"
import {
  clearPrompt,
  recordCommandHistory
} from "../../bmxt-window/shell/command-dispatch/types.ts"
import type { UiLocale } from "../../setting/locale.ts"
import { parseAndSegments } from "./parse-and-segments.ts"
import { parsePipeSegments } from "./parse-pipe-segments.ts"
import {
  formatParseErrorBlock,
  formatSegmentBlock,
  formatSkippedSegmentBlock
} from "./format-compound-log.ts"
import { runSegment } from "./run-segment.ts"
import { runPipeChain } from "../pipe/run-pipe-chain.ts"
import type { CompoundRunResult } from "./types.ts"

export async function runCompoundLine(
  fullLine: string,
  deps: CommandDispatchDeps,
  locale: UiLocale
): Promise<CompoundRunResult> {
  const parsed = parseAndSegments(fullLine)
  if (parsed.ok === false) {
    await deps.appendLogLines(formatParseErrorBlock(fullLine, parsed.error, locale))
    return {
      inputLine: fullLine,
      segments: [],
      stoppedAt: null
    }
  }

  deps.appendCommandToHistory(fullLine)
  clearPrompt(deps)
  recordCommandHistory(deps)
  deps.setSubCmdPicker(null)

  await deps.appendLogLines([`> ${fullLine}`])

  let priorFailed = false
  const results: CompoundRunResult["segments"] = []
  let stoppedAt: number | null = null

  for (let index = 0; index < parsed.segments.length; index += 1) {
    const text = parsed.segments[index]!
    if (priorFailed) {
      await deps.appendLogLines(formatSkippedSegmentBlock(text, locale))
      results.push({
        index,
        text,
        outcome: {
          ok: false,
          code: "cancelled",
          lines: []
        },
        skipped: true
      })
      continue
    }

    const pipeParsed = parsePipeSegments(text)
    if (pipeParsed.ok === false) {
      await deps.appendLogLines(formatParseErrorBlock(text, pipeParsed.error, locale))
      results.push({
        index,
        text,
        outcome: {
          ok: false,
          code: "parse",
          lines: []
        },
        skipped: false
      })
      priorFailed = true
      stoppedAt = index
      continue
    }

    const outcome =
      pipeParsed.segments.length > 1
        ? await runPipeChain(pipeParsed.segments, deps, locale)
        : await runSegment(text, deps, locale)
    await deps.appendLogLines(formatSegmentBlock(text, outcome, locale))
    results.push({ index, text, outcome, skipped: false })

    if (!outcome.ok) {
      priorFailed = true
      stoppedAt = index
    }
  }

  deps.focusPrompt()

  return {
    inputLine: fullLine,
    segments: results,
    stoppedAt
  }
}
