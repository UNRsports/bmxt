/** BMXt prompt parsing for `tabs` subcommands (picker line, move-URL Tab completion). */

/** `group new` with no tab ids - opens interactive new-group picker. */
const GROUP_NEW_INTERACTIVE_RE = /^\s*group\s+new\s*$/i

export const TABS_OPTION_CANDIDATES = ["-list", "-moveurl", "-nowurl"] as const

const TABS_LIST_RE =
  /^\s*tabs\s+-list(?:\s+-[uU])?\s*$/i

const TABS_MOVE_URL_PREFIX_RE = /^\s*tabs\s+-moveurl\s*/i

/** `tabs -list` / optional `-u` - full line must match (no extra args). */
export function parseTabsListPickerLine(trimmed: string): { showUrl: boolean } | null {
  const t = trimmed.trim()
  if (!TABS_LIST_RE.test(t)) {
    return null
  }
  const showUrl = /\s+-[uU]\s*$/i.test(t)
  return { showUrl }
}

/** Line is exactly `group new` (interactive new tab group UI). */
export function parseGroupNewInteractiveLine(trimmed: string): boolean {
  return GROUP_NEW_INTERACTIVE_RE.test(trimmed.trim())
}

export function tabsOptionCompletionZone(
  line: string,
  cursor: number
): { optionStart: number; prefix: string; optionEnd: number } | null {
  const m = /^\s*tabs\s+/.exec(line)
  if (!m) {
    return null
  }
  const optionStart = m.index + m[0].length
  if (cursor < optionStart) {
    return null
  }
  const optionEnd = optionStart + (line.slice(optionStart).match(/^[^\s]*/)?.[0].length ?? 0)
  if (cursor > optionEnd) {
    return null
  }
  const prefix = line.slice(optionStart, cursor)
  if (/\s/.test(prefix)) {
    return null
  }
  return { optionStart, prefix, optionEnd }
}

export function listTabsOptionCandidates(prefix: string): string[] {
  const p = prefix.toLowerCase()
  return TABS_OPTION_CANDIDATES.filter((opt) => opt.startsWith(p))
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
  const m = TABS_MOVE_URL_PREFIX_RE.exec(line)
  if (!m) {
    return null
  }
  const urlStart = m.index + m[0].length
  if (cursor < urlStart) {
    return null
  }
  const tokenEnd = urlTokenEnd(line, urlStart)
  if (cursor > tokenEnd) {
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
