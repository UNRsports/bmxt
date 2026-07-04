import type { CommandDispatchDeps } from "../../bmxt-window/shell/command-dispatch/types.ts"
import type { UiLocale } from "../../setting/locale.ts"
import { classifyCompoundEligibility } from "../compound/classify-eligibility.ts"
import {
  segmentFailure,
  segmentSuccess,
  withMergedLines
} from "../compound/classify-outcome.ts"
import { isExitSuccess } from "../compound/exit-status.ts"
import { runSegment } from "../compound/run-segment.ts"
import type { SegmentOutcome } from "../compound/types.ts"
import { tPipe } from "../../setting/i18n/ns/pipe.ts"
import {
  fetchListResultForCommand,
  matchPlainListCommand,
  segmentUsesListPicker
} from "../list-commands/index.ts"
import { tryRunPipeConsumer } from "./consumers/index.ts"

export async function attachListResultToOutcome(
  segment: string,
  outcome: SegmentOutcome,
  deps: CommandDispatchDeps,
  locale: UiLocale
): Promise<SegmentOutcome> {
  if (!isExitSuccess(outcome.exitStatus)) {
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

function prependAccumulated(
  outcome: SegmentOutcome,
  allStdout: readonly string[],
  allStderr: readonly string[]
): SegmentOutcome {
  return withMergedLines(
    outcome,
    [...allStdout, ...outcome.stdout],
    [...allStderr, ...outcome.stderr]
  )
}

export async function runPipeChain(
  stages: readonly string[],
  deps: CommandDispatchDeps,
  locale: UiLocale
): Promise<SegmentOutcome> {
  let listResult = undefined as SegmentOutcome["listResult"]
  const allStdout: string[] = []
  const allStderr: string[] = []

  for (let index = 0; index < stages.length; index += 1) {
    const stage = stages[index]!.trim()
    const eligibility = classifyPipeStageEligibility(stage, locale, index, deps)
    if (eligibility.eligible === false) {
      return prependAccumulated(eligibility.outcome, allStdout, allStderr)
    }

    if (index > 0) {
      if (listResult === undefined) {
        return prependAccumulated(
          segmentFailure("runtime", [tPipe("pipe.error.noStdin", locale)]),
          allStdout,
          allStderr
        )
      }
      const consumerOutcome = await tryRunPipeConsumer(stage, listResult, deps, locale)
      if (consumerOutcome === null) {
        return prependAccumulated(
          segmentFailure("runtime", [
            tPipe("pipe.error.unsupportedConsumer", locale, { stage })
          ]),
          allStdout,
          allStderr
        )
      }
      if (!isExitSuccess(consumerOutcome.exitStatus)) {
        return prependAccumulated(consumerOutcome, allStdout, allStderr)
      }
      allStdout.push(...consumerOutcome.stdout)
      allStderr.push(...consumerOutcome.stderr)
      listResult = consumerOutcome.listResult
      continue
    }

    const outcome = await runSegment(stage, deps, locale)
    if (!isExitSuccess(outcome.exitStatus)) {
      return prependAccumulated(outcome, allStdout, allStderr)
    }
    allStdout.push(...outcome.stdout)
    allStderr.push(...outcome.stderr)

    const enriched = await attachListResultToOutcome(stage, outcome, deps, locale)
    listResult = enriched.listResult
    if (stages.length > 1 && listResult === undefined) {
      return prependAccumulated(
        segmentFailure("runtime", [
          tPipe("pipe.error.notProducer", locale, { stage })
        ]),
        allStdout,
        allStderr
      )
    }
  }

  return withMergedLines(segmentSuccess(allStdout, listResult), allStdout, allStderr)
}
