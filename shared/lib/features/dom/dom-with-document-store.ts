/** EN: Full-page entry store and path lookup for dom -list --with. */
/** JA: dom -list --with のページ全体エントリと path 検索。 */

import type { DomListCapture, DomTreeEntry } from "./dom-list-capture.ts"

export function pathsEqual(
  a: readonly number[] | null | undefined,
  b: readonly number[]
): boolean {
  if (a == null || a.length !== b.length) {
    return false
  }
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) {
      return false
    }
  }
  return true
}

export function findDisplayIndexForPath(
  capture: Pick<DomListCapture, "jumpPaths" | "headerLineCount">,
  path: readonly number[]
): number {
  const start = capture.headerLineCount
  for (let i = start; i < capture.jumpPaths.length; i += 1) {
    if (pathsEqual(capture.jumpPaths[i], path)) {
      return i
    }
  }
  return -1
}

export function documentLinesFromEntries(entries: readonly DomTreeEntry[]): string[] {
  return entries.map((entry) => entry.line)
}

export function documentEntryAt(
  entries: readonly DomTreeEntry[],
  index: number
): DomTreeEntry | null {
  if (index < 0 || index >= entries.length) {
    return null
  }
  return entries[index] ?? null
}

export function bodyEntriesFromCapture(capture: DomListCapture): DomTreeEntry[] {
  const start = capture.headerLineCount
  const out: DomTreeEntry[] = []
  for (let i = start; i < capture.lines.length; i += 1) {
    const path = capture.jumpPaths[i]
    const line = capture.lines[i]
    if (path != null && line !== undefined) {
      out.push({ line, path })
    }
  }
  return out
}
