import type { BmxtRuleEntry, BmxtRuleStream } from "../../../bmxt-rule/types.ts"
import type { CommandDispatchDeps } from "../../../bmxt-window/shell/command-dispatch/types.ts"
import type { UiLocale } from "../../../setting/locale.ts"
import {
  activateDomListLinkAtPath,
  jumpDomListTargetToPath
} from "../../../dom/dom-scroll-to-path.ts"
import { navigateSheetsTabToCell } from "../../../search/sources/navigate-sheets-to-cell.ts"
import { scrollSearchPageToNeedle } from "../../../search/sources/page-scroll-to-search-needle.ts"
import { executePickerFocusPlan } from "../../../side-picker/model/focus-picker-entry.ts"
import { isGoogleSheetsUrl } from "../../../url/parse-google-sheets-url.ts"
import {
  segmentFailure,
  segmentSuccess,
  withMergedLines
} from "../../compound/classify-outcome.ts"
import type { SegmentOutcome } from "../../compound/types.ts"
import { tPipe } from "../../../setting/i18n/ns/pipe.ts"
import { isJumpPipeConsumer, JUMP_ACCEPTS_BMXT_RULE_KINDS } from "./jump-match.ts"
import type { PipeConsumerEntry } from "./types.ts"

export { isJumpPipeConsumer, JUMP_ACCEPTS_BMXT_RULE_KINDS } from "./jump-match.ts"

const TAB_FOCUS_DELAY_MS = 120

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function entryString(entries: readonly BmxtRuleEntry[], key: string): string | undefined {
  for (const [k, value] of entries) {
    if (k === key && typeof value === "string") {
      return value
    }
  }
  return undefined
}

function entryNumber(entries: readonly BmxtRuleEntry[], key: string): number | undefined {
  for (const [k, value] of entries) {
    if (k === key && typeof value === "number" && Number.isFinite(value)) {
      return Math.floor(value)
    }
  }
  return undefined
}

function producerSourceTabId(stream: BmxtRuleStream): number | undefined {
  if (stream.producer === undefined) {
    return undefined
  }
  return entryNumber(stream.producer, "sourceTabId")
}

function parsePath(pathRaw: string | undefined): number[] | null {
  if (pathRaw === undefined || pathRaw.trim().length === 0) {
    return null
  }
  const parts = pathRaw.split(".").map((p) => Number.parseInt(p, 10))
  if (parts.length === 0 || parts.some((n) => !Number.isFinite(n) || n < 0)) {
    return null
  }
  return parts
}

async function activateTab(tabId: number): Promise<boolean> {
  try {
    const tab = await chrome.tabs.get(tabId)
    if (tab.windowId === undefined) {
      return false
    }
    await executePickerFocusPlan({
      kind: "activateTab",
      tabId,
      windowId: tab.windowId
    })
    await sleep(TAB_FOCUS_DELAY_MS)
    return true
  } catch {
    return false
  }
}

/** EN: Tokenizer keeps wrapping quotes from `shellQuote`; strip before use. */
function stripWrappingQuotes(raw: string): string {
  const t = raw.trim()
  if (t.length >= 2) {
    const a = t[0]
    const b = t[t.length - 1]
    if ((a === "'" && b === "'") || (a === '"' && b === '"')) {
      return t.slice(1, -1)
    }
  }
  return t
}

async function resolveTabUrl(tabId: number, fallbackUrl: string): Promise<string> {
  const trimmed = stripWrappingQuotes(fallbackUrl)
  if (trimmed.length > 0) {
    return trimmed
  }
  try {
    const tab = await chrome.tabs.get(tabId)
    return typeof tab.url === "string" ? tab.url : ""
  } catch {
    return ""
  }
}

function cellRefFromSheetsUrl(url: string): string | undefined {
  try {
    const u = new URL(url)
    const hash = u.hash.startsWith("#") ? u.hash.slice(1) : u.hash
    const range = new URLSearchParams(hash).get("range")
    if (range && /^[A-Z]{1,3}\d{1,7}$/i.test(range.trim())) {
      return range.trim().toUpperCase()
    }
  } catch {
    return undefined
  }
  return undefined
}

/**
 * EN: Sheets has no DOM text ranges — use Name Box / Find / URL instead of page scroll.
 * JA: Sheets には DOM テキスト Range がないため、ページスクロールではなく Name Box／Find／URL を使う。
 */
async function jumpToNeedleInTab(
  tabId: number,
  needle: string,
  options: {
    url?: string
    line?: number
    cellRef?: string
    cellValue?: string
    sheetsRowTrusted?: boolean
  } = {}
): Promise<boolean> {
  const trimmed = stripWrappingQuotes(needle)
  if (!trimmed) {
    return true
  }
  const url = await resolveTabUrl(tabId, options.url ?? "")
  if (isGoogleSheetsUrl(url)) {
    const fromUrl = cellRefFromSheetsUrl(url)
    const fromOpt = (options.cellRef ?? "").trim().toUpperCase()
    const fromLine =
      options.line !== undefined && options.line > 0
        ? `A${Math.floor(options.line)}`
        : ""
    const cellRef =
      (/^[A-Z]{1,3}\d{1,7}$/.test(fromOpt) ? fromOpt : "") ||
      fromUrl ||
      (/^[A-Z]{1,3}\d{1,7}$/.test(fromLine) ? fromLine : "")
    if (!cellRef) {
      return false
    }
    // EN: Single navigation path (Name Box, else one tabs.update). No Find stacking.
    // JA: 単一ナビ（Name Box、だめなら tabs.update 一度）。Find の重ねがけはしない。
    return navigateSheetsTabToCell(tabId, url, {
      cellRef,
      cellValue: stripWrappingQuotes(options.cellValue ?? trimmed)
    })
  }
  return scrollSearchPageToNeedle(tabId, {
    searchNeedle: trimmed,
    lineNo: options.line !== undefined && options.line >= 0 ? options.line : undefined
  })
}

export async function runJumpFromBmxtRuleStream(
  stream: BmxtRuleStream,
  _deps: CommandDispatchDeps,
  locale: UiLocale
): Promise<SegmentOutcome> {
  const fallbackTabId = producerSourceTabId(stream)
  let jumped = 0
  const stderr: string[] = []

  for (const record of stream.records) {
    const tabId = entryNumber(record.entries, "tabId") ?? fallbackTabId
    if (tabId === undefined) {
      continue
    }

    if (record.kind === "dom.node") {
      const path = parsePath(entryString(record.entries, "path"))
      if (path === null) {
        continue
      }
      const ok = await jumpDomListTargetToPath(tabId, path, {
        focusWindow: true,
        persistHighlight: true
      })
      if (ok) {
        jumped += 1
      } else {
        stderr.push(tPipe("pipe.jump.failed", locale, { tabId: String(tabId) }))
      }
      continue
    }

    const needle = (entryString(record.entries, "pattern") ?? "").trim()
    const url = entryString(record.entries, "url") ?? ""
    const activated = await activateTab(tabId)
    if (!activated) {
      stderr.push(tPipe("pipe.jump.failed", locale, { tabId: String(tabId) }))
      continue
    }
    if (needle.length > 0) {
      const scrolled = await jumpToNeedleInTab(tabId, needle, { url })
      if (!scrolled) {
        stderr.push(tPipe("pipe.jump.scrollFailed", locale, { tabId: String(tabId) }))
      }
    }
    jumped += 1
  }

  if (jumped === 0) {
    return segmentFailure("runtime", [tPipe("pipe.jump.noTargets", locale), ...stderr])
  }
  return withMergedLines(segmentSuccess([]), [], stderr)
}

/** EN: Direct `jump --tab …` helper used by UiAction apply. */
export async function runJumpTargetAction(args: {
  tabId: number
  path: string
  needle: string
  line: number
  matchIndex: number
  url: string
  activateLink: boolean
  locale: UiLocale
}): Promise<SegmentOutcome> {
  const { tabId, locale } = args
  if (args.path.trim().length > 0) {
    const path = parsePath(args.path)
    if (path === null) {
      return segmentFailure("usage", [tPipe("pipe.jump.badPath", locale)])
    }
    if (args.activateLink) {
      const ok = await activateDomListLinkAtPath(tabId, path, { focusWindow: true })
      if (!ok) {
        return segmentFailure("runtime", [
          tPipe("pipe.jump.failed", locale, { tabId: String(tabId) })
        ])
      }
      return segmentSuccess([])
    }
    const ok = await jumpDomListTargetToPath(tabId, path, {
      focusWindow: true,
      persistHighlight: true
    })
    if (!ok) {
      return segmentFailure("runtime", [
        tPipe("pipe.jump.failed", locale, { tabId: String(tabId) })
      ])
    }
    return segmentSuccess([])
  }

  const activated = await activateTab(tabId)
  if (!activated) {
    return segmentFailure("runtime", [
      tPipe("pipe.jump.failed", locale, { tabId: String(tabId) })
    ])
  }
  const needle = args.needle.trim()
  if (needle.length > 0) {
    const scrolled = await jumpToNeedleInTab(tabId, needle, {
      url: args.url,
      line: args.line
    })
    if (!scrolled && args.line > 0) {
      return withMergedLines(
        segmentSuccess([]),
        [],
        [tPipe("pipe.jump.scrollFailed", locale, { tabId: String(tabId) })]
      )
    }
  }
  return segmentSuccess([])
}

export const jumpPipeConsumer: PipeConsumerEntry = {
  id: "jump",
  match: isJumpPipeConsumer,
  acceptsKinds: JUMP_ACCEPTS_BMXT_RULE_KINDS,
  run: (stream, deps, locale, _segment, _context) =>
    runJumpFromBmxtRuleStream(stream, deps, locale)
}
