import type { ListResult } from "../list-output/types.ts"
import type { CommandDispatchDeps } from "../../bmxt-window/shell/command-dispatch/types.ts"
import type { UiLocale } from "../../setting/locale.ts"
import { parseDomListLine } from "../../dom/dom-list-parse.ts"
import { fetchDomListResult } from "../../dom/dom-list-plain.ts"
import { parseSessionListLine } from "../../session/session-list-parse.ts"
import { buildSessionListResult } from "../../session/session-list-result.ts"
import { parseSettingListLine } from "../../setting/setting-list-parse.ts"
import { buildSettingListResult } from "../../setting/setting-list-result.ts"
import { parseSearchListLine } from "../../search/search-list-parse.ts"
import { fetchSearchListResult } from "../../search/search-list-plain.ts"
import { parseTabsListLine } from "../../tabs/input.ts"
import { fetchTabsListResult } from "../../tabs/tabs-list-plain.ts"

export type ListProducerMatch =
  | { kind: "tabs-list"; showUrl: boolean }
  | {
      kind: "dom-list"
      flavor: "--html" | "--react"
      pickerMode: "normal" | "with"
      showTag: boolean
      pattern: string
    }
  | { kind: "session-list" }
  | { kind: "setting-list" }
  | { kind: "search-list"; dispatchLine: string }

export function matchListProducer(segment: string): ListProducerMatch | null {
  const trimmed = segment.trim()

  const tabs = parseTabsListLine(trimmed)
  if (tabs !== null && !tabs.picker) {
    return { kind: "tabs-list", showUrl: tabs.showUrl }
  }

  const dom = parseDomListLine(trimmed)
  if (dom !== null && !dom.picker) {
    return {
      kind: "dom-list",
      flavor: dom.flavor,
      pickerMode: dom.pickerMode,
      showTag: dom.showTag,
      pattern: dom.pattern
    }
  }

  const session = parseSessionListLine(trimmed)
  if (session !== null && !session.picker) {
    return { kind: "session-list" }
  }

  const setting = parseSettingListLine(trimmed)
  if (setting !== null && !setting.picker) {
    return { kind: "setting-list" }
  }

  const search = parseSearchListLine(trimmed)
  if (search !== null && !search.picker) {
    return { kind: "search-list", dispatchLine: search.dispatchLine }
  }

  return null
}

export function segmentUsesListPicker(segment: string): boolean {
  const trimmed = segment.trim()
  if (parseTabsListLine(trimmed)?.picker) {
    return true
  }
  if (parseDomListLine(trimmed)?.picker) {
    return true
  }
  if (parseSessionListLine(trimmed)?.picker) {
    return true
  }
  if (parseSettingListLine(trimmed)?.picker) {
    return true
  }
  const searchParts = trimmed.split(/\s+/).filter(Boolean)
  if (searchParts.length >= 2 && searchParts[0]!.toLowerCase() === "search") {
    return searchParts.some((part) => part.toLowerCase() === "--picker")
  }
  return false
}

export async function fetchListResultForProducer(
  match: ListProducerMatch,
  deps: CommandDispatchDeps,
  locale: UiLocale
): Promise<ListResult> {
  switch (match.kind) {
    case "tabs-list":
      return fetchTabsListResult({ showUrl: match.showUrl, locale })
    case "dom-list":
      return fetchDomListResult({
        flavor: match.flavor,
        pattern: match.pattern,
        pickerMode: match.pickerMode,
        showTag: match.showTag,
        locale
      })
    case "session-list":
      return buildSessionListResult(deps.sessionListRows)
    case "setting-list":
      return buildSettingListResult(deps.uiSettings, locale)
    case "search-list":
      return fetchSearchListResult({
        dispatchLine: match.dispatchLine,
        locale,
        ctx: {
          enqueueSessionPatch: () => {},
          clearLog: async () => {},
          exitPane: async () => [],
          listWindows: async () => [],
          focusInfo: async () => [],
          resolveTabArg: async () => undefined,
          commandSessionId: deps.sessionId,
          uiLocale: locale
        }
      })
    default: {
      const _exhaustive: never = match
      throw new Error(`unsupported list producer: ${String(_exhaustive)}`)
    }
  }
}
