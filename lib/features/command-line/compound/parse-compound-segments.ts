export type CompoundOperator = "&&" | "||" | ";"

export type ParseCompoundSegmentsResult =
  | { ok: true; segments: string[]; operators: CompoundOperator[] }
  | { ok: false; error: "unclosed_quote" | "dangling_operator" | "empty_segment" }

/** EN: True when the line contains a top-level `&&`, `||`, or `;` (ignores quoted regions). */
export function lineHasListOperator(line: string): boolean {
  const parsed = parseCompoundSegments(line)
  return parsed.ok && parsed.segments.length > 1
}

/**
 * EN: Split on `&&` / `||` / `;` with POSIX-inspired quoting and escapes
 * (`'…'`, `"…"`, `\&&`, `\||`, `\;`). Single `|` is left for the pipe parser.
 */
export function parseCompoundSegments(line: string): ParseCompoundSegmentsResult {
  const segments: string[] = []
  const operators: CompoundOperator[] = []
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

    if (ch === "\\" && i + 2 < n && line[i + 1] === "&" && line[i + 2] === "&") {
      current += "&&"
      i += 3
      continue
    }

    if (ch === "\\" && i + 2 < n && line[i + 1] === "|" && line[i + 2] === "|") {
      current += "||"
      i += 3
      continue
    }

    if (ch === "\\" && i + 1 < n && line[i + 1] === ";") {
      current += ";"
      i += 2
      continue
    }

    const op = matchCompoundOperator(line, i)
    if (op !== null) {
      const seg = current.trim()
      if (seg.length === 0) {
        return { ok: false, error: "empty_segment" }
      }
      segments.push(seg)
      operators.push(op.operator)
      current = ""
      i += op.length
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

  return { ok: true, segments, operators }
}

function matchCompoundOperator(
  line: string,
  i: number
): { operator: CompoundOperator; length: number } | null {
  const ch = line[i]!
  if (ch === "&" && i + 1 < line.length && line[i + 1] === "&") {
    return { operator: "&&", length: 2 }
  }
  if (ch === "|" && i + 1 < line.length && line[i + 1] === "|") {
    return { operator: "||", length: 2 }
  }
  if (ch === ";") {
    return { operator: ";", length: 1 }
  }
  return null
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
