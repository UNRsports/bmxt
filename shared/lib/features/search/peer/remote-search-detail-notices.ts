import type { ListRecord } from "../../command-line/list-output/types.ts"

/**
 * EN: Parse `notices=a|b` segment from a remote search detail string.
 * JA: リモート search の detail から `notices=a|b` を取り出す。
 */
export function extractRemoteSearchNoticeLines(detail: string | null | undefined): string[] {
  if (detail === undefined || detail === null || detail.length === 0) {
    return []
  }
  const marker = "notices="
  const idx = detail.indexOf(marker)
  if (idx < 0) {
    return []
  }
  const rest = detail.slice(idx + marker.length)
  const end = rest.indexOf(";")
  const raw = end >= 0 ? rest.slice(0, end) : rest
  const out: string[] = []
  for (const part of raw.split("|")) {
    const trimmed = part.trim()
    if (trimmed.length > 0) {
      out.push(trimmed)
    }
  }
  return out
}

export function remoteSearchNoticeRecords(
  detail: string | null | undefined,
  pattern: string
): ListRecord[] {
  const lines = extractRemoteSearchNoticeLines(detail)
  return lines.map((line, index) => ({
    kind: "search.hit" as const,
    fields: {
      index: index + 1,
      source: "notice",
      title: line,
      url: "",
      tabId: null,
      hitCount: 0,
      pattern
    },
    display: { label: line }
  }))
}
