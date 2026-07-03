import type { ListResult } from "../list-output/types.ts"
import type { SegmentOutcome, SegmentOutcomeCode } from "./types.ts"

/** EN: Infer segment success from terminal log lines (background / captured output). */
export function classifyOutcomeFromLines(lines: readonly string[]): Pick<
  SegmentOutcome,
  "ok" | "code" | "errorMessage"
> {
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
  listResult?: ListResult
): SegmentOutcome {
  return { ok: true, code: "ok", lines: [...lines], listResult }
}

export function segmentFailure(
  code: SegmentOutcomeCode,
  lines: readonly string[],
  errorMessage?: string
): SegmentOutcome {
  return {
    ok: false,
    code,
    lines: [...lines],
    errorMessage: errorMessage ?? lines.find((l) => l.trim().length > 0)
  }
}
