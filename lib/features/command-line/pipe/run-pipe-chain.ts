import type { CommandDispatchDeps } from "../../bmxt-window/shell/command-dispatch/types.ts"
import type { UiLocale } from "../../setting/locale.ts"
import { classifyCompoundEligibility } from "../compound/classify-eligibility.ts"
import {
  segmentFailure,
  segmentSuccess
} from "../compound/classify-outcome.ts"
import { runSegment } from "../compound/run-segment.ts"
import type { SegmentOutcome } from "../compound/types.ts"
import { tPipe } from "../../setting/i18n/ns/pipe.ts"
import {
  fetchListResultForCommand,
  matchPlainListCommand,
  segmentUsesListPicker
} from "../list-commands/index.ts"
import { tryRunPipeConsumer } from "./consumers/close-from-tabs.ts"

export async function attachListResultToOutcome(
  segment: string,
  outcome: SegmentOutcome,
  deps: CommandDispatchDeps,
  locale: UiLocale
): Promise<SegmentOutcome> {
  if (!outcome.ok) {
    return outcome
  }
  const match = matchPlainListCommand(segment)
  if (match === null) {
    return outcome
  }
  try {
    const listResult = await fetchListResultForCommand(match, { locale, deps })
    return { ...outcome, listResult }
  } catch {
    return outcome
  }
}

function classifyPipeStageEligibility(
  stage: string,
  locale: UiLocale,
  stageIndex: number,
  deps: CommandDispatchDeps
): ReturnType<typeof classifyCompoundEligibility> {
  if (segmentUsesListPicker(stage)) {
    return {
      eligible: false,
      outcome: segmentFailure("interactive", [tPipe("pipe.error.picker", locale)])
    }
  }
  if (stageIndex > 0) {
    return { eligible: true }
  }
  return classifyCompoundEligibility(stage, locale, deps.sessionNameTypingRef.current)
}

export async function runPipeChain(
  stages: readonly string[],
  deps: CommandDispatchDeps,
  locale: UiLocale
): Promise<SegmentOutcome> {
  let listResult = undefined as SegmentOutcome["listResult"]
  const allLines: string[] = []

  for (let index = 0; index < stages.length; index += 1) {
    const stage = stages[index]!.trim()
    const eligibility = classifyPipeStageEligibility(stage, locale, index, deps)
    if (eligibility.eligible === false) {
      return eligibility.outcome
    }

    if (index > 0) {
      if (listResult === undefined) {
        return segmentFailure("runtime", [tPipe("pipe.error.noStdin", locale)])
      }
      const consumerOutcome = await tryRunPipeConsumer(stage, listResult, deps, locale)
      if (consumerOutcome === null) {
        return segmentFailure("runtime", [
          tPipe("pipe.error.unsupportedConsumer", locale, { stage })
        ])
      }
      if (!consumerOutcome.ok) {
        return { ...consumerOutcome, lines: [...allLines, ...consumerOutcome.lines] }
      }
      allLines.push(...consumerOutcome.lines)
      listResult = consumerOutcome.listResult
      continue
    }

    const outcome = await runSegment(stage, deps, locale)
    if (!outcome.ok) {
      return { ...outcome, lines: [...allLines, ...outcome.lines] }
    }
    allLines.push(...outcome.lines)

    const enriched = await attachListResultToOutcome(stage, outcome, deps, locale)
    listResult = enriched.listResult
    if (stages.length > 1 && listResult === undefined) {
      return segmentFailure("runtime", [
        tPipe("pipe.error.notProducer", locale, { stage })
      ])
    }
  }

  return segmentSuccess(allLines, listResult)
}
