export type RedirectChannel = "stdout" | "stderr"

export type RedirectSpec = {
  channel: RedirectChannel
  /** EN: `write` (`>`) and `append` (`>>`) are equivalent for the null sink. */
  mode: "write" | "append"
  target: string
}

export type ParseRedirectResult =
  | { ok: true; command: string; redirects: RedirectSpec[] }
  | { ok: false; error: "unclosed_quote" | "dangling_redirect" | "empty_redirect_target" }

/** EN: Supported redirect targets (no OS file descriptors — null sink only). */
export const NULL_REDIRECT_TARGETS: ReadonlySet<string> = new Set(["null", "/dev/null"])

export function isNullRedirectTarget(target: string): boolean {
  return NULL_REDIRECT_TARGETS.has(target)
}

/**
 * EN: Split trailing `>` / `>>` / `2>` / `2>>` redirects from a segment.
 * Quoted regions and `\>` / `\>>` escapes are not treated as operators.
 */
export function parseRedirects(segment: string): ParseRedirectResult {
  const redirects: RedirectSpec[] = []
  let commandEnd = segment.length
  let i = 0
  const n = segment.length
  const redirectStarts: number[] = []

  while (i < n) {
    const ch = segment[i]!

    if (ch === "'") {
      const end = readSingleQuoted(segment, i)
      if (end < 0) {
        return { ok: false, error: "unclosed_quote" }
      }
      i = end + 1
      continue
    }

    if (ch === '"') {
      const end = readDoubleQuoted(segment, i)
      if (end < 0) {
        return { ok: false, error: "unclosed_quote" }
      }
      i = end + 1
      continue
    }

    if (ch === "\\" && i + 1 < n && segment[i + 1] === ">") {
      i += 2
      continue
    }

    const op = matchRedirectOperator(segment, i)
    if (op !== null) {
      redirectStarts.push(i)
      i += op.length
      while (i < n && segment[i] === " ") {
        i += 1
      }
      if (i >= n) {
        return { ok: false, error: "empty_redirect_target" }
      }
      const targetStart = i
      while (i < n && segment[i] !== " " && !isRedirectOperatorStart(segment, i)) {
        if (segment[i] === "'" || segment[i] === '"') {
          break
        }
        if (segment[i] === "\\" && i + 1 < n) {
          i += 2
          continue
        }
        i += 1
      }
      if (i === targetStart) {
        return { ok: false, error: "empty_redirect_target" }
      }
      const target = segment.slice(targetStart, i).trim()
      if (target.length === 0) {
        return { ok: false, error: "empty_redirect_target" }
      }
      redirects.push({
        channel: op.channel,
        mode: op.mode,
        target
      })
      continue
    }

    i += 1
  }

  if (redirectStarts.length > 0) {
    commandEnd = redirectStarts[0]!
  }

  const command = segment.slice(0, commandEnd).trim()
  if (command.length === 0) {
    return { ok: false, error: "dangling_redirect" }
  }

  return { ok: true, command, redirects }
}

function matchRedirectOperator(
  line: string,
  i: number
): { channel: RedirectChannel; mode: "write" | "append"; length: number } | null {
  if (line[i] === "2" && i + 1 < line.length && line[i + 1] === ">") {
    if (i + 2 < line.length && line[i + 2] === ">") {
      return { channel: "stderr", mode: "append", length: 3 }
    }
    return { channel: "stderr", mode: "write", length: 2 }
  }
  if (line[i] === ">") {
    if (i + 1 < line.length && line[i + 1] === ">") {
      return { channel: "stdout", mode: "append", length: 2 }
    }
    return { channel: "stdout", mode: "write", length: 1 }
  }
  return null
}

function isRedirectOperatorStart(line: string, i: number): boolean {
  return matchRedirectOperator(line, i) !== null
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
