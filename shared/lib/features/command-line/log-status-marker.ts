/**
 * EN: In-band OK / NG tokens for terminal log lines (colored at render).
 * JA: ターミナルログ行末の OK / NG トークン（描画時に着色）。
 */

export type LogStatusKind = "ok" | "ng"

const STATUS_PREFIX = "\u001fstatus:"
const STATUS_SUFFIX = "\u001f"

/** EN: Encode a trailing status token (append after the label text). */
export function encodeLogStatusToken(status: LogStatusKind): string {
  return `${STATUS_PREFIX}${status}${STATUS_SUFFIX}`
}

/** EN: Build `label  OK|NG` with an in-band status marker after a space. */
export function encodeLogStatusLine(label: string, status: LogStatusKind): string {
  return `${label} ${encodeLogStatusToken(status)}`
}

export type LogStatusSegment =
  | { kind: "text"; text: string }
  | { kind: "status"; status: LogStatusKind }

const STATUS_SPLIT_RE = /(\u001fstatus:(?:ok|ng)\u001f)/g

/** EN: Split a log line into plain text and OK/NG status segments. */
export function parseLogStatusSegments(text: string): LogStatusSegment[] {
  const parts = text.split(STATUS_SPLIT_RE)
  const segments: LogStatusSegment[] = []
  for (const part of parts) {
    if (part.length === 0) {
      continue
    }
    if (part === `${STATUS_PREFIX}ok${STATUS_SUFFIX}`) {
      segments.push({ kind: "status", status: "ok" })
      continue
    }
    if (part === `${STATUS_PREFIX}ng${STATUS_SUFFIX}`) {
      segments.push({ kind: "status", status: "ng" })
      continue
    }
    segments.push({ kind: "text", text: part })
  }
  if (segments.length === 0) {
    return [{ kind: "text", text: "" }]
  }
  return segments
}
