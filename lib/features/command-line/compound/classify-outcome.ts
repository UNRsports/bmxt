import { mergeOutputLines } from "../command-output.ts"
import type { ListResult } from "../list-output/types.ts"
import type { BmxtRuleStream } from "../../bmxt-rule/types.ts"
import { EXIT_SUCCESS, exitStatusForCode } from "./exit-status.ts"
import type { SegmentOutcome, SegmentOutcomeCode } from "./types.ts"

export type SegmentFailureCode = Exclude<SegmentOutcomeCode, "ok">

export type ClassifiedOutcome =
  | { ok: true; code: "ok" }
  | { ok: false; code: SegmentFailureCode; errorMessage?: string }

/** EN: Infer segment success from terminal log lines (background / captured output). */
export function classifyOutcomeFromLines(lines: readonly string[]): ClassifiedOutcome {
  for (const raw of lines) {
    const line = raw.trim()
    if (/unknown command:/i.test(line) || line.includes("不明なコマンド")) {
      return { ok: false, code: "unknown", errorMessage: line }
    }
    if (/^error:/i.test(line)) {
      return { ok: false, code: "runtime", errorMessage: line }
    }
    if (/^usage:/i.test(line)) {
      return { ok: false, code: "usage", errorMessage: line }
    }
    if (line.includes("available options") || line.includes("利用可能なオプション")) {
      return { ok: false, code: "usage", errorMessage: line }
    }
  }
  return { ok: true, code: "ok" }
}

export function segmentSuccess(
  lines: readonly string[],
  listResult?: ListResult,
  bmxtRuleStream?: BmxtRuleStream
): SegmentOutcome {
  const stdout = [...lines]
  const stderr: string[] = []
  return {
    ok: true,
    code: "ok",
    exitStatus: EXIT_SUCCESS,
    stdout,
    stderr,
    lines: mergeOutputLines(stdout, stderr),
    listResult,
    bmxtRuleStream
  }
}

export function segmentFailure(
  code: SegmentFailureCode,
  lines: readonly string[],
  errorMessage?: string
): SegmentOutcome {
  const exitStatus = exitStatusForCode(code)
  const stdout: string[] = []
  const stderr = [...lines]
  return {
    ok: false,
    code,
    exitStatus,
    stdout,
    stderr,
    lines: mergeOutputLines(stdout, stderr),
    errorMessage: errorMessage ?? lines.find((l) => l.trim().length > 0)
  }
}

/** EN: Rebuild `lines` after mutating stdout/stderr on an outcome. */
export function withMergedLines(
  outcome: SegmentOutcome,
  stdout: readonly string[],
  stderr: readonly string[]
): SegmentOutcome {
  return {
    ...outcome,
    stdout: [...stdout],
    stderr: [...stderr],
    lines: mergeOutputLines(stdout, stderr)
  }
}
