/**
 * EN: Pure match / extract helpers for `bookmark -add` pipe consumer (no host effects).
 * JA: `bookmark -add` パイプ用の純粋マッチ／抽出（ホスト effect 非依存）。
 */

import type { BmxtRuleRecord, BmxtRuleStream } from "../../../bmxt-rule/types.ts"
import { normalizePickerOpenUrl } from "../../../side-picker/model/normalize-picker-open-url.ts"
import { classifyPipeConsumer } from "./classify.ts"

export const BOOKMARK_ADD_ACCEPTS_BMXT_RULE_KINDS = [
  "page.open",
  "bookmark",
  "history",
  "search.hit",
  "markdown.file"
] as const

export type BookmarkAddPipeFlags = {
  parentId: string | null
  dupMode: "" | "force" | "skip"
}

export type BookmarkAddStreamItem = {
  url: string
  title: string
}

function entryString(record: BmxtRuleRecord, key: string): string | null {
  for (const [k, value] of record.entries) {
    if (k === key && typeof value === "string" && value.trim().length > 0) {
      return value.trim()
    }
  }
  return null
}

/**
 * EN: Extract URL + title pairs from accepted stream kinds (dedupe by URL).
 * JA: 受付 kind から URL+title を抽出し、URL で重複排除する。
 */
export function bookmarkAddItemsFromBmxtRuleStream(
  stream: BmxtRuleStream
): BookmarkAddStreamItem[] {
  const out: BookmarkAddStreamItem[] = []
  const seen = new Set<string>()
  for (const record of stream.records) {
    if (
      record.kind !== "page.open" &&
      record.kind !== "bookmark" &&
      record.kind !== "history" &&
      record.kind !== "search.hit" &&
      record.kind !== "markdown.file"
    ) {
      continue
    }
    const rawUrl = entryString(record, "url")
    if (rawUrl === null) {
      continue
    }
    const url = normalizePickerOpenUrl(rawUrl)
    if (url === undefined || seen.has(url)) {
      continue
    }
    seen.add(url)
    const title =
      entryString(record, "pageTitle") ??
      entryString(record, "title") ??
      url
    out.push({ url, title })
  }
  return out
}

export function parseBookmarkAddPipeSegment(segment: string): BookmarkAddPipeFlags | null {
  const classified = classifyPipeConsumer(segment)
  if (classified === null || classified.id !== "bookmark-add") {
    return null
  }
  const dupMode =
    classified.dupMode === "force" || classified.dupMode === "skip"
      ? classified.dupMode
      : ""
  return {
    parentId: classified.parentId,
    dupMode
  }
}

export function isBookmarkAddPipeConsumer(segment: string): boolean {
  return parseBookmarkAddPipeSegment(segment) !== null
}
