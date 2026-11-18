import type { BmxtRuleRecord, BmxtRuleStream } from "../../../bmxt-rule/types.ts"

/**
 * EN: True when stdin has no records, or at least one record kind is accepted.
 * Extra kinds (e.g. `page.window` alongside `page.open`) are ignored by the consumer.
 */
export function bmxtRuleStreamAcceptsKinds(
  stream: BmxtRuleStream,
  acceptsKinds: readonly string[]
): boolean {
  if (stream.records.length === 0) {
    return true
  }
  const accepted = new Set(acceptsKinds)
  for (const record of stream.records) {
    if (accepted.has(record.kind)) {
      return true
    }
  }
  return false
}

export function tabIdsFromBmxtRuleStream(stream: BmxtRuleStream): number[] {
  const ids: number[] = []
  for (const record of stream.records) {
    if (record.kind !== "page.open") {
      continue
    }
    const tabId = Number(getTabIdFromRecord(record))
    if (Number.isFinite(tabId) && tabId > 0) {
      ids.push(tabId)
    }
  }
  return ids
}

function getTabIdFromRecord(record: BmxtRuleRecord): number | null {
  for (const [key, value] of record.entries) {
    if (key === "tabId" && typeof value === "number") {
      return value
    }
  }
  return null
}

function getStringEntryFromRecord(record: BmxtRuleRecord, key: string): string | null {
  for (const [k, value] of record.entries) {
    if (k === key && typeof value === "string" && value.length > 0) {
      return value
    }
  }
  return null
}

/**
 * EN: Extract bookmarkId values from bookmark / bookmark.folder stream records.
 * JA: bookmark / bookmark.folder レコードから bookmarkId を抽出する。
 */
export function bookmarkIdsFromBmxtRuleStream(stream: BmxtRuleStream): string[] {
  const ids: string[] = []
  for (const record of stream.records) {
    if (record.kind !== "bookmark" && record.kind !== "bookmark.folder") {
      continue
    }
    const id = getStringEntryFromRecord(record, "bookmarkId")
    if (id !== null) {
      ids.push(id)
    }
  }
  return ids
}

/**
 * EN: Extract { url, title, parentId } from bookmark records for bookmark-send.
 * JA: bookmark-send 用に bookmark レコードから { url, title, parentId } を抽出する。
 */
export function bookmarkItemsFromBmxtRuleStream(
  stream: BmxtRuleStream
): Array<{ url: string; title: string; parentId: string | null }> {
  const items: Array<{ url: string; title: string; parentId: string | null }> = []
  for (const record of stream.records) {
    if (record.kind !== "bookmark" && record.kind !== "bookmark.folder") {
      continue
    }
    const url = getStringEntryFromRecord(record, "url")
    if (!url || url.length === 0) {
      continue
    }
    const title = getStringEntryFromRecord(record, "pageTitle") ?? url
    const parentId = getStringEntryFromRecord(record, "parentId")
    items.push({ url, title, parentId })
  }
  return items
}

/**
 * EN: Extract URL strings from history stream records.
 * JA: history レコードから URL 文字列を抽出する。
 */
export function urlsFromHistoryBmxtRuleStream(stream: BmxtRuleStream): string[] {
  const urls: string[] = []
  for (const record of stream.records) {
    if (record.kind !== "history" && record.kind !== "search.hit") {
      continue
    }
    const url = getStringEntryFromRecord(record, "url")
    if (url !== null) {
      urls.push(url)
    }
  }
  return urls
}
