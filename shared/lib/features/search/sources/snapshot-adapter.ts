import type { SearchPageMatch } from "../../side-picker/model/picker-entry"
import { snapshotMarkdownBodyLines } from "../../snapshot/snapshot-markdown"
import { listSnapshotDocumentsForSearch } from "../../snapshot/snapshot-storage"
import { linesForSearchElement, matchesNeedle } from "../index"

const SNIPPET_MAX = 500

function lineMatches(pattern: string, line: string, matchAll: boolean): boolean {
  if (matchAll) {
    return line.trim().length > 0
  }
  return matchesNeedle(line, pattern)
}

function buildSnapshotMatches(
  markdown: string,
  pattern: string,
  matchAll: boolean
): SearchPageMatch[] {
  const lines = snapshotMarkdownBodyLines(markdown)
  const matches: SearchPageMatch[] = []
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? ""
    if (!lineMatches(pattern, line, matchAll)) {
      continue
    }
    const snippet = line.trim().slice(0, SNIPPET_MAX)
    if (!matchAll && snippet.length === 0) {
      continue
    }
    matches.push({
      lineNo: i + 1,
      snippet: snippet.length > 0 ? snippet : "(blank line)",
      occurrence: 0
    })
  }
  return matches
}

/** EN: Search saved Markdown snapshots (internal or external per settings storage mode). */
export async function searchSnapshotLines(pattern: string): Promise<string[]> {
  const docs = await listSnapshotDocumentsForSearch()
  const matchAll = !pattern.trim()
  const matches: string[] = []
  let hitCount = 0

  for (const doc of docs) {
    const lineHits = buildSnapshotMatches(doc.markdown, pattern, matchAll)
    if (!matchAll && lineHits.length === 0) {
      const blob = `${doc.meta.title} ${doc.meta.url} ${doc.path}`
      if (!matchesNeedle(blob, pattern)) {
        continue
      }
      hitCount += 1
      matches.push(
        ...linesForSearchElement("snapshot", {
          title: doc.meta.title || "(no title)",
          path: doc.path,
          url: doc.meta.url || "(no url)"
        })
      )
      continue
    }
    if (matchAll && lineHits.length === 0) {
      const preview = doc.markdown
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean)
        .slice(0, 3)
      const fallback =
        preview.length > 0
          ? preview.map((pl, idx) => ({
              lineNo: idx + 1,
              snippet: pl.slice(0, SNIPPET_MAX),
              occurrence: 0
            }))
          : [{ lineNo: 0, snippet: "(empty snapshot)", occurrence: 0 }]
      hitCount += 1
      const fields: Record<string, string> = {
        title: doc.meta.title || "(no title)",
        path: doc.path,
        url: doc.meta.url || "(no url)"
      }
      const block = linesForSearchElement("snapshot", fields)
      for (const m of fallback) {
        block.splice(block.length - 1, 0, `match: L${m.lineNo}: ${m.snippet}`)
      }
      matches.push(...block)
      continue
    }
    if (lineHits.length === 0) {
      continue
    }
    hitCount += 1
    const fields: Record<string, string> = {
      title: doc.meta.title || "(no title)",
      path: doc.path,
      url: doc.meta.url || "(no url)"
    }
    const block = linesForSearchElement("snapshot", fields)
    for (const m of lineHits) {
      block.splice(block.length - 1, 0, `match: L${m.lineNo}: ${m.snippet}`)
    }
    matches.push(...block)
  }

  if (matches.length === 0) {
    return ["(no snapshot matches — pattern is case-insensitive substring, or empty pattern for all)"]
  }
  return [`(${hitCount} snapshot(s))`, ...matches]
}
