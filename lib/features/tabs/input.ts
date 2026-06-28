/** BMXt prompt parsing for `tabs` subcommands (picker line, move-URL Tab completion). */

import { resolveActiveCommandSegment } from "../command-line/compound/active-segment.ts"
import { listSecondTokenCandidatesByCommand } from "../builtin-commands/command-subcommands.gen"
import { optionTokenZoneAfterLead } from "../command-line/option-token-zone"

/** `group new` with no tab ids - opens interactive new-group picker. */
const GROUP_NEW_INTERACTIVE_RE = /^\s*group\s+new\s*$/i

const TABS_LIST_RE =
  /^\s*tabs\s+-list(?:\s+-[uU])?\s*$/i

const TABS_EXIT_LIST_RE = /^\s*tabs\s+-exit\s+-list\s*$/i

const TABS_MOVE_URL_PREFIX_RE = /^\s*tabs\s+-moveurl\s*/i

const TABS_OPTION_LEAD_RE = /^\s*tabs\s+/i

/** `tabs -list` / optional `-u` - full line must match (no extra args). */
export function parseTabsListPickerLine(trimmed: string): { showUrl: boolean } | null {
  const t = trimmed.trim()
  if (!TABS_LIST_RE.test(t)) {
    return null
  }
  const showUrl = /\s+-[uU]\s*$/i.test(t)
  return { showUrl }
}

/** `tabs -exit -list` — close tab picker in this pane (full line must match). */
export function parseTabsExitListLine(trimmed: string): boolean {
  return TABS_EXIT_LIST_RE.test(trimmed.trim())
}

/** Line is exactly `group new` (interactive new tab group UI). */
export function parseGroupNewInteractiveLine(trimmed: string): boolean {
  return GROUP_NEW_INTERACTIVE_RE.test(trimmed.trim())
}

export function tabsOptionCompletionZone(
  line: string,
  cursor: number
): { optionStart: number; prefix: string; optionEnd: number } | null {
  return optionTokenZoneAfterLead(line, cursor, TABS_OPTION_LEAD_RE)
}

export function listTabsOptionCandidates(prefix: string): string[] {
  return listSecondTokenCandidatesByCommand("tabs", prefix)
}

function urlTokenEnd(line: string, urlStart: number): number {
  const after = line.slice(urlStart)
  const mTok = /^[^\s]*/.exec(after)
  const tokenLen = mTok?.[0]?.length ?? 0
  return urlStart + tokenLen
}

/**
 * When the cursor is in the URL token after `tabs -moveurl`, return indices and prefix for filtering.
 * Returns null if not in move-URL completion zone.
 */
export function tabsMoveUrlCompletionZone(
  line: string,
  cursor: number
): { urlStart: number; prefix: string; tokenEnd: number } | null {
  const active = resolveActiveCommandSegment(line, cursor)
  const segmentLine = line.slice(active.segmentStart, active.segmentEnd)
  const localCursor = active.localCursor
  const m = TABS_MOVE_URL_PREFIX_RE.exec(segmentLine)
  if (!m) {
    return null
  }
  const urlStartLocal = m.index + m[0].length
  if (localCursor < urlStartLocal) {
    return null
  }
  const urlStart = active.segmentStart + urlStartLocal
  const tokenEnd = urlTokenEnd(line, urlStart)
  if (localCursor > tokenEnd - active.segmentStart) {
    return null
  }
  const prefix = line.slice(urlStart, cursor)
  if (/\s/.test(prefix)) {
    return null
  }
  return { urlStart, prefix, tokenEnd }
}

/** Distinct http(s) tab URLs, sorted; filtered by `prefix` when non-empty. */
export async function listTabsMoveUrlCandidates(prefix: string): Promise<string[]> {
  const tabs = await chrome.tabs.query({})
  const set = new Set<string>()
  for (const t of tabs) {
    const u = t.url
    if (!u || (!u.startsWith("http://") && !u.startsWith("https://"))) {
      continue
    }
    set.add(u)
  }
  const all = [...set].sort()
  if (!prefix) {
    return all
  }
  return all.filter((u) => u.startsWith(prefix))
}
