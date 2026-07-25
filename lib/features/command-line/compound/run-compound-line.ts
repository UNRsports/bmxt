import type { CommandDispatchDeps } from "../../bmxt-window/shell/command-dispatch/types.ts"
import {
  clearPrompt,
  recordCommandHistory
} from "../../bmxt-window/shell/command-dispatch/types.ts"
import type { UiLocale } from "../../setting/locale.ts"
import { parseTabChipProducerSegment } from "../pipe/producers/tab-chip-producer.ts"
import { parseCompoundSegments } from "./parse-compound-segments.ts"
import { parsePipeSegments } from "./parse-pipe-segments.ts"
import { appendCompoundLogBlock } from "./append-compound-log.ts"
import {
  formatParseErrorBlock,
  formatSegmentBlock,
  formatSkippedSegmentBlock
} from "./format-compound-log.ts"
import {
  compoundShouldStop,
  EXIT_MISUSE,
  EXIT_SUCCESS,
  shouldRunAfterOperator
} from "./exit-status.ts"
import { segmentFailure } from "./classify-outcome.ts"
import { runSegment } from "./run-segment.ts"
import { runPipeChain } from "../pipe/run-pipe-chain.ts"
import type { CompoundRunResult, SegmentOutcome } from "./types.ts"
import type { CompoundLogBlock } from "./format-compound-log.ts"

/** EN: Chip-only activate — show move message without `[{segment}]` echo. */
function formatChipOnlyActivateBlock(outcome: SegmentOutcome): CompoundLogBlock {
  return {
    stdout: [...outcome.stdout],
    stderr: [...outcome.stderr]
  }
}

function formatOutcomeBlock(
  text: string,
  outcome: SegmentOutcome,
  locale: UiLocale,
  pipeStageCount: number
): CompoundLogBlock {
  if (
    pipeStageCount === 1 &&
    outcome.ok &&
    parseTabChipProducerSegment(text) !== null
  ) {
    return formatChipOnlyActivateBlock(outcome)
  }
  return formatSegmentBlock(text, outcome, locale)
}

export async function runCompoundLine(
  fullLine: string,
  deps: CommandDispatchDeps,
  locale: UiLocale
): Promise<CompoundRunResult> {
  const parsed = parseCompoundSegments(fullLine)
  if (parsed.ok === false) {
    await appendCompoundLogBlock(deps, formatParseErrorBlock(fullLine, parsed.error, locale))
    return {
      inputLine: fullLine,
      segments: [],
      stoppedAt: null,
      exitStatus: EXIT_MISUSE
    }
  }

  deps.appendCommandToHistory(fullLine)
  clearPrompt(deps)
  recordCommandHistory(deps)
  deps.setSubCmdPicker(null)

  await deps.appendLogLines([`> ${fullLine}`], "stdout")

  const results: CompoundRunResult["segments"] = []
  let stoppedAt: number | null = null
  let exitStatus = EXIT_SUCCESS
  let priorExitStatus = EXIT_SUCCESS

  for (let index = 0; index < parsed.segments.length; index += 1) {
    const text = parsed.segments[index]!
    const operator = index === 0 ? null : parsed.operators[index - 1]!
    const shouldRun =
      operator === null ? true : shouldRunAfterOperator(operator, priorExitStatus)

    if (!shouldRun) {
      await appendCompoundLogBlock(deps, formatSkippedSegmentBlock(text, locale))
      results.push({
        index,
        text,
        outcome: segmentFailure("cancelled", []),
        skipped: true
      })
      continue
    }

    const pipeParsed = parsePipeSegments(text)
    if (pipeParsed.ok === false) {
      const outcome = segmentFailure("parse", [])
      await appendCompoundLogBlock(deps, formatParseErrorBlock(text, pipeParsed.error, locale))
      results.push({
        index,
        text,
        outcome,
        skipped: false
      })
      priorExitStatus = outcome.exitStatus
      exitStatus = outcome.exitStatus
      if (compoundShouldStop(outcome.exitStatus)) {
        stoppedAt = index
      }
      continue
    }

    const outcome =
      pipeParsed.segments.length > 1
        ? await runPipeChain(pipeParsed.segments, deps, locale)
        : await runSegment(text, deps, locale)
    await appendCompoundLogBlock(
      deps,
      formatOutcomeBlock(text, outcome, locale, pipeParsed.segments.length)
    )
    results.push({ index, text, outcome, skipped: false })
    priorExitStatus = outcome.exitStatus
    exitStatus = outcome.exitStatus

    if (compoundShouldStop(outcome.exitStatus)) {
      stoppedAt = index
    }
  }

  deps.focusPrompt()

  return {
    inputLine: fullLine,
    segments: results,
    stoppedAt,
    exitStatus
  }
}
