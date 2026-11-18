/**
 * EN: Prompt completion zone for `bookmark … --parent <id>` (folder id candidates).
 * JA: `bookmark … --parent <id>` の候補ゾーン（フォルダ id）。
 */

import { resolveActiveCommandSegment } from "../command-line/compound/active-segment.ts"
import { resolveActivePipeStage } from "../command-line/compound/pipe-stage-spans.ts"
import { listBookmarkParentIdCandidates } from "./folders.ts"

const BOOKMARK_LEAD_RE = /^\s*bookmark\b/i
const PARENT_VALUE_LEAD_RE = /(?:^|\s)--parent\s+/i

/**
 * EN: When the cursor is in the value token after `--parent`, return replace range + prefix.
 *     Works in a bare `bookmark …` line and in a pipe RHS stage (`… | bookmark -add --parent `).
 * JA: カーソルが `--parent` 直後の値トークン内なら置換範囲と prefix を返す。
 *     単独行およびパイプ右辺の両方に対応する。
 */
export function bookmarkParentCompletionZone(
  line: string,
  cursor: number
): { valueStart: number; prefix: string; tokenEnd: number } | null {
  const active = resolveActiveCommandSegment(line, cursor)
  const segmentLine = line.slice(active.segmentStart, active.segmentEnd)
  const pipe = resolveActivePipeStage(segmentLine, active.localCursor)
  const stageLine = segmentLine.slice(pipe.stageStart, pipe.stageEnd)
  const localInStage = pipe.localCursor

  if (!BOOKMARK_LEAD_RE.test(stageLine)) {
    return null
  }

  const m = PARENT_VALUE_LEAD_RE.exec(stageLine)
  if (m === null) {
    return null
  }
  const valueStartLocalInStage = m.index + m[0].length
  if (localInStage < valueStartLocalInStage) {
    return null
  }

  const valueStart =
    active.segmentStart + pipe.stageStart + valueStartLocalInStage
  const after = line.slice(valueStart)
  const mTok = /^[^\s]*/.exec(after)
  const tokenLen = mTok?.[0]?.length ?? 0
  const tokenEnd = valueStart + tokenLen
  const stageTokenEnd = tokenEnd - (active.segmentStart + pipe.stageStart)
  if (localInStage > stageTokenEnd) {
    return null
  }
  const prefix = line.slice(valueStart, cursor)
  if (/\s/.test(prefix)) {
    return null
  }
  return { valueStart, prefix, tokenEnd }
}

/** EN: Distinct folder ids for `--parent`, filtered by prefix (title or id). */
export async function listBookmarkParentCompletionValues(
  prefix: string
): Promise<string[]> {
  const cands = await listBookmarkParentIdCandidates(prefix)
  return cands.map((c) => c.id)
}
