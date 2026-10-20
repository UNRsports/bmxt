import type { ListResult } from "./list-output/types.ts"

/** EN: Logical output channel (POSIX stdout / stderr). */
export type LogChannel = "stdout" | "stderr"

/**
 * EN: Canonical command output for the BMXt POSIX Profile.
 * Terminal log lines are a projection of these channels.
 */
export type CommandOutput = {
  stdout: string[]
  stderr: string[]
  listResult?: ListResult
  exitStatus: number
}

/**
 * EN: In-band marker for stderr lines stored in `string[]` session logs.
 * Absent prefix means stdout (backward compatible with pre-channel logs).
 */
export const STDERR_LOG_PREFIX = "\u001e"

/** EN: Encode a display line for session log storage. */
export function encodeLogLine(text: string, channel: LogChannel): string {
  if (channel === "stderr") {
    return `${STDERR_LOG_PREFIX}${text}`
  }
  return text
}

/** EN: Decode a stored session log line into text + channel. */
export function decodeLogLine(raw: string): { text: string; channel: LogChannel } {
  if (raw.startsWith(STDERR_LOG_PREFIX)) {
    return { text: raw.slice(STDERR_LOG_PREFIX.length), channel: "stderr" }
  }
  return { text: raw, channel: "stdout" }
}

/** EN: Encode each line for the given channel. */
export function encodeLogLines(lines: readonly string[], channel: LogChannel): string[] {
  if (channel === "stdout") {
    return [...lines]
  }
  return lines.map((line) => encodeLogLine(line, "stderr"))
}

/** EN: Combined display order: stdout then stderr. */
export function mergeOutputLines(stdout: readonly string[], stderr: readonly string[]): string[] {
  return [...stdout, ...stderr]
}
