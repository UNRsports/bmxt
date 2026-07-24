import type { ListRecordKind, ListResult } from "../command-line/list-output/types.ts"

export type PickerListFamily = "tabs" | "search" | "dom" | "session" | "setting"

const KIND_FAMILY: Record<ListRecordKind, PickerListFamily> = {
  "tabs.window": "tabs",
  "tabs.group": "tabs",
  "tabs.tab": "tabs",
  "search.hit": "search",
  "dom.node": "dom",
  "dom.notice": "dom",
  "session.row": "session",
  "setting.field": "setting"
}

export type ResolvePickerFamilyResult =
  | { ok: true; family: PickerListFamily }
  | { ok: false; reason: "empty" | "mixed" }

/**
 * EN: Map stdin `ListResult` to a single picker family (mixed families are rejected).
 * JA: stdin の `ListResult` を単一の picker 族に写す（混在は拒否）。
 */
export function resolvePickerFamily(listResult: ListResult): ResolvePickerFamilyResult {
  if (listResult.records.length === 0) {
    const fromCommand = familyFromCommandName(listResult.command)
    if (fromCommand !== null) {
      return { ok: true, family: fromCommand }
    }
    return { ok: false, reason: "empty" }
  }

  let family: PickerListFamily | null = null
  for (const record of listResult.records) {
    const next = KIND_FAMILY[record.kind]
    if (family === null) {
      family = next
      continue
    }
    if (family !== next) {
      return { ok: false, reason: "mixed" }
    }
  }

  if (family === null) {
    return { ok: false, reason: "empty" }
  }
  return { ok: true, family }
}

function familyFromCommandName(command: string): PickerListFamily | null {
  const name = command.trim().toLowerCase()
  if (name === "tab") return "tabs"
  if (name === "search") return "search"
  if (name === "dom") return "dom"
  if (name === "session") return "session"
  if (name === "setting") return "setting"
  return null
}
