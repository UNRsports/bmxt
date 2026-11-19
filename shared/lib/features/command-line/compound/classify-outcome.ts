import { mergeOutputLines } from "../command-output.ts"
import type { ListResult } from "../list-output/types.ts"
import type { BmxtRuleStream } from "../../bmxt-rule/types.ts"
import {
  EXIT_MISUSE,
  EXIT_NOT_FOUND,
  EXIT_SUCCESS,
  exitStatusForCode,
  isExitSuccess
} from "./exit-status.ts"
import type { SegmentOutcome, SegmentOutcomeCode } from "./types.ts"

export type SegmentFailureCode = Exclude<SegmentOutcomeCode, "ok">

export type ClassifiedOutcome =
  | { ok: true; code: "ok" }
  | { ok: false; code: SegmentFailureCode; errorMessage?: string }

/**
 * EN: Legacy fallback — infer success from display lines (SW patches without exitStatus).
 * Prefer `segmentOutcomeFromExitStatus` when Rust stamped `DispatchBundle.exitStatus`.
 * JA: レガシー。SW patch 等で exitStatus が無いときのみ。Rust stamp があればそちら優先。
 */
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

/** EN: Map numeric plan-time exit status to SegmentOutcomeCode. */
export function segmentCodeFromExitStatus(exitStatus: number): SegmentOutcomeCode {
  if (isExitSuccess(exitStatus)) {
    return "ok"
  }
  if (exitStatus === EXIT_NOT_FOUND) {
    return "unknown"
  }
  if (exitStatus === EXIT_MISUSE) {
    return "usage"
  }
  return "runtime"
}

export function segmentSuccess(
  lines: readonly string[],
  listResult?: ListResult,
  bmxtRuleStream?: BmxtRuleStream,
  listPlan?: import("../list-commands/list-plan-from-ir.ts").ListPlan
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
    bmxtRuleStream,
    listPlan
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

/**
 * EN: Map plan-time exitStatus + lines to a segment outcome (Rust SoT).
 * JA: 計画時 exitStatus + lines → SegmentOutcome（Rust が SoT）。
 */
export function segmentOutcomeFromExitStatus(
  lines: readonly string[],
  exitStatus: number
): SegmentOutcome {
  const code = segmentCodeFromExitStatus(exitStatus)
  if (code === "ok") {
    return segmentSuccess([...lines])
  }
  return segmentFailure(code, [...lines])
}

/**
 * EN: Map WASM / host `lines` to a segment outcome.
 * When `exitStatus` is provided (Rust stamp), use it; otherwise legacy line scrape.
 * JA: `exitStatus` があればそれを使い、無ければレガシー行スクレイプ。
 */
export function segmentOutcomeFromLines(
  lines: readonly string[],
  exitStatus?: number
): SegmentOutcome {
  if (typeof exitStatus === "number" && Number.isFinite(exitStatus)) {
    return segmentOutcomeFromExitStatus(lines, exitStatus)
  }
  const classified = classifyOutcomeFromLines(lines)
  if (classified.ok === false) {
    return segmentFailure(classified.code, [...lines], classified.errorMessage)
  }
  return segmentSuccess([...lines])
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

/** EN: Attach a structured list plan onto an existing outcome. */
export function withListPlan(
  outcome: SegmentOutcome,
  listPlan: import("../list-commands/list-plan-from-ir.ts").ListPlan
): SegmentOutcome {
  return { ...outcome, listPlan }
}
