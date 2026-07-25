/**
 * EN: Legacy `#t:<id>` chip helpers (prompt mirror / log rewrite).
 * Tab-verb targeting is bare command (active) or pipe (`tab -list | back`); no live tab picker.
 */

import { BMXT_WINDOW_ID_KEY } from "../extension-storage/keys.ts"
import { resolveTabFaviconSrc } from "../tabs/tab-favicon-url.ts"

export const NAV_RELOAD_TAB_TOKEN_RE = /^#t:(\d+)$/

/** EN: Default visible title length inside a prompt chip (code points). */
export const NAV_RELOAD_CHIP_TITLE_MAX_CHARS = 24

export type NavReloadTabTokenSpan = {
  start: number
  end: number
  tabId: number
  token: string
}

/** EN: Display metadata for a selected `#t:<id>` chip in the prompt mirror / log. */
export type NavReloadTabChipMeta = {
  title: string
  faviconSrc: string | null
  /** EN: Picker row / tooltip label (title only — never tab id). */
  label: string
  /** EN: Tab URL when known (log `tab::` chips show title + url). */
  url: string
}

/** EN: Format a tab id as a prompt block token. */
export function formatNavReloadTabToken(tabId: number): string {
  return `#t:${tabId}`
}

export function parseNavReloadTabToken(token: string): number | null {
  const m = NAV_RELOAD_TAB_TOKEN_RE.exec(token.trim())
  if (!m) {
    return null
  }
  const id = Number(m[1])
  if (!Number.isInteger(id) || id < 0) {
    return null
  }
  return id
}

/** EN: Truncate a tab title for the default chip face (ellipsis when longer). */
export function truncateNavReloadChipTitle(
  title: string,
  maxChars: number = NAV_RELOAD_CHIP_TITLE_MAX_CHARS
): string {
  const trimmed = title.trim() || "(no title)"
  if (maxChars <= 0) {
    return "…"
  }
  const chars = [...trimmed]
  if (chars.length <= maxChars) {
    return chars.join("")
  }
  if (maxChars === 1) {
    return "…"
  }
  return `${chars.slice(0, maxChars - 1).join("")}…`
}

/** EN: Find `#t:<id>` spans in a full prompt line. */
export function findNavReloadTabTokenSpans(line: string): NavReloadTabTokenSpan[] {
  const spans: NavReloadTabTokenSpan[] = []
  const re = /#t:(\d+)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(line)) !== null) {
    const token = m[0]!
    const tabId = Number(m[1])
    if (!Number.isInteger(tabId) || tabId < 0) {
      continue
    }
    spans.push({
      start: m.index,
      end: m.index + token.length,
      tabId,
      token
    })
  }
  return spans
}

/** EN: True when the caret is on a `#t:<id>` block (inside, either edge, or trailing space). */
export function isNavReloadTabBlockFocused(
  line: string,
  cursor: number,
  span: NavReloadTabTokenSpan
): boolean {
  if (cursor >= span.start && cursor <= span.end) {
    return true
  }
  return cursor === span.end + 1 && line[span.end] === " "
}

/**
 * EN: If caret sits inside a `#t:<id>` token (not on an edge), snap to the block end
 *     so the mirror always shows a whole-chip focus.
 */
export function snapNavReloadTabBlockCaret(line: string, cursor: number): number {
  const spans = findNavReloadTabTokenSpans(line)
  for (const span of spans) {
    if (cursor > span.start && cursor < span.end) {
      return span.end
    }
  }
  return cursor
}

/**
 * EN: ArrowLeft/ArrowRight — jump one `#t:<id>` block at a time when in the chip region.
 * Returns null when the browser default character move should run (e.g. still in `reload `).
 */
export function moveNavReloadTabBlockCaret(
  line: string,
  cursor: number,
  direction: -1 | 1
): number | null {
  const spans = findNavReloadTabTokenSpans(line)
  if (spans.length === 0) {
    return null
  }
  const regionStart = spans[0]!.start
  const last = spans[spans.length - 1]!

  const indexForCursor = (pos: number): number => {
    for (let i = 0; i < spans.length; i++) {
      const s = spans[i]!
      if (pos >= s.start && pos <= s.end) {
        return i
      }
      if (i + 1 < spans.length) {
        const next = spans[i + 1]!
        if (pos > s.end && pos < next.start) {
          return direction > 0 ? i + 1 : i
        }
      }
    }
    return -1
  }

  if (direction > 0) {
    if (cursor < regionStart) {
      if (cursor + 1 >= regionStart) {
        return spans[0]!.end
      }
      return null
    }
    if (cursor > last.end) {
      return null
    }
    const idx = indexForCursor(cursor)
    if (idx < 0) {
      return null
    }
    const s = spans[idx]!
    if (cursor < s.end) {
      return s.end
    }
    if (idx + 1 < spans.length) {
      return spans[idx + 1]!.end
    }
    return line.length > last.end ? line.length : null
  }

  if (cursor <= regionStart) {
    return null
  }
  if (cursor > last.end) {
    if (cursor - 1 <= last.end) {
      return last.end
    }
    return null
  }
  const idx = indexForCursor(cursor)
  if (idx < 0) {
    return null
  }
  const s = spans[idx]!
  if (cursor > s.start) {
    if (idx === 0) {
      return regionStart
    }
    return spans[idx - 1]!.end
  }
  if (idx === 0) {
    return null
  }
  return spans[idx - 1]!.end
}

function removeNavReloadTabSpan(
  line: string,
  span: NavReloadTabTokenSpan
): { line: string; cursor: number } {
  let start = span.start
  let end = span.end
  if (line[end] === " ") {
    end += 1
  } else if (start > 0 && line[start - 1] === " ") {
    start -= 1
  }
  const nextLine = line.slice(0, start) + line.slice(end)
  return { line: nextLine, cursor: start }
}

/**
 * EN: If Backspace at `cursor` would delete into a `#t:<id>` block (including the
 *     optional trailing space after it), remove that whole block in one step.
 */
export function deleteNavReloadTabBlockAtCursor(
  line: string,
  cursor: number
): { line: string; cursor: number } | null {
  if (cursor <= 0) {
    return null
  }
  const spans = findNavReloadTabTokenSpans(line)
  for (const span of spans) {
    let zoneEnd = span.end
    if (line[zoneEnd] === " ") {
      zoneEnd += 1
    }
    // EN: Caret on the token, or on its trailing separator space → erase the block.
    if (cursor > span.start && cursor <= zoneEnd) {
      return removeNavReloadTabSpan(line, span)
    }
  }
  return null
}

/**
 * EN: If Delete (forward) at `cursor` would delete into a `#t:<id>` block, remove
 * that whole block (and one adjacent space when appropriate).
 */
export function deleteNavReloadTabBlockForwardAtCursor(
  line: string,
  cursor: number
): { line: string; cursor: number } | null {
  if (cursor >= line.length) {
    return null
  }
  const spans = findNavReloadTabTokenSpans(line)
  for (const span of spans) {
    if (cursor >= span.start && cursor < span.end) {
      return removeNavReloadTabSpan(line, span)
    }
    // EN: Caret on the trailing space after the token — still erase the block.
    if (cursor === span.end && line[span.end] === " ") {
      return removeNavReloadTabSpan(line, span)
    }
  }
  return null
}

/**
 * EN: Completion zone for live tab pickers on tab-verbs — disabled.
 * Targeting is bare (active) or pipe; do not open a `command {tabs}` menu.
 */
export function navReloadTabCompletionZone(
  _line: string,
  _cursor: number
): { tokenStart: number; tokenEnd: number; prefix: string } | null {
  return null
}

export type NavReloadTabCandidate = {
  insertToken: string
  label: string
  tabId: number
  title: string
  url: string
  faviconSrc: string | null
}

/**
 * EN: Incremental filter for reload/back/forward tab menu.
 * - bare needle → title contains (case-insensitive)
 * - `@…` → URL contains (case-insensitive); bare `@` matches all
 */
export function matchesNavReloadTabNeedle(
  title: string,
  url: string,
  prefix: string
): boolean {
  const raw = prefix.trim()
  if (raw.length === 0) {
    return true
  }
  if (raw.startsWith("@")) {
    const urlNeedle = raw.slice(1).trim().toLowerCase()
    if (urlNeedle.length === 0) {
      return true
    }
    return url.toLowerCase().includes(urlNeedle)
  }
  return title.toLowerCase().includes(raw.toLowerCase())
}

/** EN: Open tabs in normal browser windows (excludes BMXt shell window). */
export async function listNavReloadTabCandidates(
  prefix: string
): Promise<NavReloadTabCandidate[]> {
  const stored = await chrome.storage.local.get(BMXT_WINDOW_ID_KEY)
  const bmxtWin = stored[BMXT_WINDOW_ID_KEY] as number | undefined
  const tabs = await chrome.tabs.query({})
  const out: NavReloadTabCandidate[] = []
  for (const tab of tabs) {
    if (tab.id === undefined) {
      continue
    }
    if (typeof bmxtWin === "number" && tab.windowId === bmxtWin) {
      continue
    }
    const title = (tab.title ?? "").trim() || "(no title)"
    const rawUrl = typeof tab.url === "string" ? tab.url : ""
    if (!matchesNavReloadTabNeedle(title, rawUrl, prefix)) {
      continue
    }
    const faviconSrc = resolveTabFaviconSrc(rawUrl)
    const insertToken = formatNavReloadTabToken(tab.id)
    out.push({
      insertToken,
      label: title,
      tabId: tab.id,
      title,
      url: rawUrl,
      faviconSrc
    })
  }
  out.sort((a, b) => a.tabId - b.tabId)
  return out
}

/** EN: Build chip meta from a picker candidate. */
export function navReloadTabChipMetaFromCandidate(
  candidate: NavReloadTabCandidate
): NavReloadTabChipMeta {
  return {
    title: candidate.title,
    faviconSrc: candidate.faviconSrc,
    label: candidate.label,
    url: candidate.url
  }
}
