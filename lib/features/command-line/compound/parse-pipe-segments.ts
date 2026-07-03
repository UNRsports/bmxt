import type { ParseAndSegmentsResult } from "./types.ts"

export type ParsePipeSegmentsResult = ParseAndSegmentsResult

/** EN: True when the line contains a top-level `|` (ignores quoted regions). */
export function lineHasPipeOperator(line: string): boolean {
  const parsed = parsePipeSegments(line)
  return parsed.ok && parsed.segments.length > 1
}

/**
 * EN: Split on `|` with POSIX-inspired quoting (`'…'`, `"…"`, `\|`).
 * JA: `|` で分割（クォート内・エスケープは演算子にしない）。
 */
export function parsePipeSegments(line: string): ParsePipeSegmentsResult {
  const segments: string[] = []
  let current = ""
  let i = 0
  const n = line.length

  while (i < n) {
    const ch = line[i]!

    if (ch === "'") {
      const end = readSingleQuoted(line, i)
      if (end < 0) {
        return { ok: false, error: "unclosed_quote" }
      }
      current += line.slice(i, end + 1)
      i = end + 1
      continue
    }

    if (ch === '"') {
      const end = readDoubleQuoted(line, i)
      if (end < 0) {
        return { ok: false, error: "unclosed_quote" }
      }
      current += line.slice(i, end + 1)
      i = end + 1
      continue
    }

    if (ch === "\\" && i + 1 < n && line[i + 1] === "|") {
      current += "|"
      i += 2
      continue
    }

    if (ch === "|") {
      const stage = current.trim()
      if (stage.length === 0) {
        return { ok: false, error: "empty_segment" }
      }
      segments.push(stage)
      current = ""
      i += 1
      continue
    }

    current += ch
    i += 1
  }

  const tail = current.trim()
  if (tail.length === 0) {
    if (segments.length > 0) {
      return { ok: false, error: "dangling_operator" }
    }
    return { ok: false, error: "empty_segment" }
  }
  segments.push(tail)

  if (segments.length === 0) {
    return { ok: false, error: "empty_segment" }
  }

  return { ok: true, segments }
}

function readSingleQuoted(line: string, start: number): number {
  let i = start + 1
  while (i < line.length) {
    if (line[i] === "'") {
      return i
    }
    i += 1
  }
  return -1
}

function readDoubleQuoted(line: string, start: number): number {
  let i = start + 1
  while (i < line.length) {
    const ch = line[i]!
    if (ch === "\\" && i + 1 < line.length) {
      i += 2
      continue
    }
    if (ch === '"') {
      return i
    }
    i += 1
  }
  return -1
}
