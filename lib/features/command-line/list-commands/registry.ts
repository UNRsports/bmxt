import { parseDomListLine } from "../../dom/dom-list-parse.ts"
import { parseSearchListLine } from "../../search/search-list-parse.ts"
import { parseSessionListLine } from "../../session/session-list-parse.ts"
import { parseSettingListLine } from "../../setting/setting-list-parse.ts"
import { parseTabsListLine } from "../../tabs/tabs-list-parse.ts"
import type { ListResult } from "../list-output/types.ts"
import type {
  ListCommandEntry,
  ListCommandFetchContext,
  ListCommandId,
  ListCommandMatcher,
  MatchedListCommand
} from "./types.ts"
import type { UiLocale } from "../../setting/locale.ts"

type ListCommandMatcherDef = ListCommandMatcher

/** EN: Lightweight matchers (parse only — no Chrome / DOM fetch at import time). */
const LIST_COMMAND_MATCHERS: readonly ListCommandMatcherDef[] = [
  {
    id: "tabs",
    command: "tabs",
    runtime: "service_worker",
    matchPlain(segment) {
      const parsed = parseTabsListLine(segment)
      if (parsed === null || parsed.picker) {
        return null
      }
      return { showUrl: parsed.showUrl }
    },
    usesPicker(segment) {
      return parseTabsListLine(segment)?.picker === true
    }
  },
  {
    id: "dom",
    command: "dom",
    runtime: "service_worker",
    matchPlain(segment) {
      const parsed = parseDomListLine(segment)
      if (parsed === null || parsed.picker) {
        return null
      }
      return {
        flavor: parsed.flavor,
        pickerMode: parsed.pickerMode,
        showTag: parsed.showTag,
        pattern: parsed.pattern
      }
    },
    usesPicker(segment) {
      return parseDomListLine(segment)?.picker === true
    }
  },
  {
    id: "session",
    command: "session",
    runtime: "ui",
    matchPlain(segment) {
      const parsed = parseSessionListLine(segment)
      if (parsed === null || parsed.picker) {
        return null
      }
      return {}
    },
    usesPicker(segment) {
      return parseSessionListLine(segment)?.picker === true
    }
  },
  {
    id: "setting",
    command: "setting",
    runtime: "ui",
    matchPlain(segment) {
      const parsed = parseSettingListLine(segment)
      if (parsed === null || parsed.picker) {
        return null
      }
      return {}
    },
    usesPicker(segment) {
      return parseSettingListLine(segment)?.picker === true
    }
  },
  {
    id: "search",
    command: "search",
    runtime: "service_worker",
    matchPlain(segment) {
      const parsed = parseSearchListLine(segment)
      if (parsed === null || parsed.picker) {
        return null
      }
      return { dispatchLine: parsed.dispatchLine }
    },
    usesPicker(segment) {
      return parseSearchListLine(segment)?.picker === true
    }
  }
] as const

export const LIST_COMMAND_ENTRIES: readonly ListCommandMatcher[] = LIST_COMMAND_MATCHERS

export async function loadListCommandEntry(id: ListCommandId): Promise<ListCommandEntry> {
  switch (id) {
    case "tabs":
      return (await import("../../tabs/tabs-list-command.ts")).tabsListCommand
    case "dom":
      return (await import("../../dom/dom-list-command.ts")).domListCommand
    case "search":
      return (await import("../../search/search-list-command.ts")).searchListCommand
    case "session":
      return (await import("../../session/session-list-command.ts")).sessionListCommand
    case "setting":
      return (await import("../../setting/setting-list-command.ts")).settingListCommand
    default: {
      const _exhaustive: never = id
      throw new Error(`unknown list command: ${String(_exhaustive)}`)
    }
  }
}

export function getListCommandById(id: ListCommandId): ListCommandMatcher | undefined {
  return LIST_COMMAND_MATCHERS.find((entry) => entry.id === id)
}

export function matchPlainListCommand(segment: string): MatchedListCommand | null {
  const trimmed = segment.trim()
  for (const matcher of LIST_COMMAND_MATCHERS) {
    const match = matcher.matchPlain(trimmed)
    if (match !== null) {
      return { entry: matcher, match }
    }
  }
  return null
}

export function segmentUsesListPicker(segment: string): boolean {
  const trimmed = segment.trim()
  for (const matcher of LIST_COMMAND_MATCHERS) {
    if (matcher.usesPicker(trimmed)) {
      return true
    }
  }
  return false
}

export async function fetchListResultForCommand(
  matched: MatchedListCommand,
  ctx: ListCommandFetchContext
): Promise<ListResult> {
  const entry = await loadListCommandEntry(matched.entry.id)
  return entry.fetchListResult(matched.match, ctx)
}

export function formatPlainLinesForCommand(
  matched: MatchedListCommand,
  result: ListResult,
  locale: UiLocale
): Promise<string[]> {
  return loadListCommandEntry(matched.entry.id).then((entry) =>
    entry.formatPlainLines(result, locale, matched.match)
  )
}
