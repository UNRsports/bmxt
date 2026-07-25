import type { CommandDispatchDeps } from "../../bmxt-window/shell/command-dispatch/types.ts"
import type { UiLocale } from "../../setting/locale.ts"
import { bmxtRuleStreamFromListResult } from "../../bmxt-rule/index.ts"
import { bmxtRuleStreamFromTabIds } from "../../bmxt-rule/adapters/from-tab-ids.ts"
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
  type MatchedListCommand
} from "../list-commands/index.ts"
import type { ListResult } from "../list-output/types.ts"
import { tryRunPipeConsumer } from "./consumers/index.ts"
import { parseTabChipProducerSegment } from "./producers/tab-chip-producer.ts"

function showUrlFromListMatch(match: MatchedListCommand | null): boolean {
  if (match === null) {
    return false
  }
  const parsed = match.match
  if (typeof parsed === "object" && parsed !== null && "showUrl" in parsed) {
    return Boolean((parsed as { showUrl: boolean }).showUrl)
  }
  return false
}

export async function attachBmxtRuleStreamToOutcome(
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
    const bmxtRuleStream = bmxtRuleStreamFromListResult(listResult)
    return { ...outcome, listResult, bmxtRuleStream }
  } catch {
    return outcome
  }
}

/** @deprecated Use attachBmxtRuleStreamToOutcome */
export const attachListResultToOutcome = attachBmxtRuleStreamToOutcome

function classifyPipeStageEligibility(
  stage: string,
  locale: UiLocale,
  stageIndex: number,
  deps: CommandDispatchDeps
): ReturnType<typeof classifyCompoundEligibility> {
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
  let bmxtRuleStream = undefined as SegmentOutcome["bmxtRuleStream"]
  let listResult = undefined as ListResult | undefined
  let showUrl = false
  const allStdout: string[] = []
  const allStderr: string[] = []

  for (let index = 0; index < stages.length; index += 1) {
    const stage = stages[index]!.trim()
    const eligibility = classifyPipeStageEligibility(stage, locale, index, deps)
    if (eligibility.eligible === false) {
      return prependAccumulated(eligibility.outcome, allStdout, allStderr)
    }

    if (index > 0) {
      if (bmxtRuleStream === undefined) {
        return prependAccumulated(
          segmentFailure("runtime", [tPipe("pipe.error.noStdin", locale)]),
          allStdout,
          allStderr
        )
      }
      const consumerOutcome = await tryRunPipeConsumer(stage, bmxtRuleStream, deps, locale, {
        listResult,
        showUrl
      })
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
      bmxtRuleStream = consumerOutcome.bmxtRuleStream
      if (consumerOutcome.listResult !== undefined) {
        listResult = consumerOutcome.listResult
      }
      continue
    }

    // EN: Synthetic producer — `#t:<id>…` chips (optional trailing `tab:`) → page.open stream.
    const chipIds = parseTabChipProducerSegment(stage)
    if (chipIds !== null) {
      bmxtRuleStream = bmxtRuleStreamFromTabIds(chipIds)
      listResult = undefined
      showUrl = false
      if (stages.length === 1) {
        // EN: Chips alone (no consumer) — nothing to print; stream available for chaining.
      }
      continue
    }

    const outcome = await runSegment(stage, deps, locale, {
      // EN: Pipe producer feeds the consumer stream only — do not echo plain `-list` into the log.
      suppressLogPatches: stages.length > 1
    })
    if (!isExitSuccess(outcome.exitStatus)) {
      return prependAccumulated(outcome, allStdout, allStderr)
    }
    // EN: In a pipe, producer stdout feeds the consumer (bmxtRule stream), not the terminal.
    if (stages.length === 1) {
      allStdout.push(...outcome.stdout)
    }
    allStderr.push(...outcome.stderr)

    const listMatch = matchPlainListCommand(stage)
    showUrl = showUrlFromListMatch(listMatch)
    const enriched = await attachBmxtRuleStreamToOutcome(stage, outcome, deps, locale)
    bmxtRuleStream = enriched.bmxtRuleStream
    listResult = enriched.listResult
    if (stages.length > 1 && bmxtRuleStream === undefined) {
      return prependAccumulated(
        segmentFailure("runtime", [
          tPipe("pipe.error.notProducer", locale, { stage })
        ]),
        allStdout,
        allStderr
      )
    }
  }

  return withMergedLines(
    segmentSuccess(allStdout, undefined, bmxtRuleStream),
    allStdout,
    allStderr
  )
}
