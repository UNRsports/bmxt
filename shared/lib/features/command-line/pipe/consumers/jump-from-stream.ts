import type { BmxtRuleEntry, BmxtRuleStream } from "../../../bmxt-rule/types.ts"
import type { CommandDispatchDeps } from "../../../bmxt-window/shell/command-dispatch/types.ts"
import type { UiLocale } from "../../../setting/locale.ts"
import {
  activateDomListLinkAtPath,
  jumpDomListTargetToPath
} from "../../../dom/dom-scroll-to-path.ts"
import { scrollSearchPageToNeedle } from "../../../search/sources/page-scroll-to-search-needle.ts"
import { executePickerFocusPlan } from "../../../side-picker/model/focus-picker-entry.ts"
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
    const activated = await activateTab(tabId)
    if (!activated) {
      stderr.push(tPipe("pipe.jump.failed", locale, { tabId: String(tabId) }))
      continue
    }
    if (needle.length > 0) {
      const scrolled = await scrollSearchPageToNeedle(tabId, {
        searchNeedle: needle
      })
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
    const scrolled = await scrollSearchPageToNeedle(tabId, {
      searchNeedle: needle,
      lineNo: args.line >= 0 ? args.line : undefined
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
