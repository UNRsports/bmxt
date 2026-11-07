import type { BmxtRuleRecord, BmxtRuleStream } from "../../../bmxt-rule/types.ts"
import { sanitizeGroupTitle } from "../../../sync/bus/remote-open-sanitize.ts"

export type SyncOpenUrlBatch = {
  groupTitle: string | null
  urls: string[]
}

function entryValue(record: BmxtRuleRecord, key: string): string | number | boolean | null {
  for (const [k, value] of record.entries) {
    if (k === key) {
      return value
    }
  }
  return null
}

function urlFromRecord(record: BmxtRuleRecord): string | null {
  const url = entryValue(record, "url")
  if (typeof url !== "string") {
    return null
  }
  const trimmed = url.trim()
  if (trimmed.length === 0) {
    return null
  }
  return trimmed
}

function labelFromGroup(record: BmxtRuleRecord): string | null {
  const label = entryValue(record, "label")
  if (typeof label === "string" && label.trim().length > 0) {
    return label.trim()
  }
  const title = entryValue(record, "pageTitle")
  if (typeof title === "string" && title.trim().length > 0) {
    return title.trim()
  }
  return null
}

/**
 * EN: Walk stream in order; page.group sets current title; URL-bearing kinds append to batch.
 */
export function urlBatchesFromBmxtRuleStream(stream: BmxtRuleStream): SyncOpenUrlBatch[] {
  const batches: SyncOpenUrlBatch[] = []
  let currentTitle: string | null = null
  let currentUrls: string[] = []

  const flush = (): void => {
    if (currentUrls.length === 0) {
      return
    }
    batches.push({
      groupTitle: sanitizeGroupTitle(currentTitle),
      urls: [...currentUrls]
    })
    currentUrls = []
  }

  for (const record of stream.records) {
    if (record.kind === "page.group") {
      flush()
      currentTitle = labelFromGroup(record)
      continue
    }
    if (
      record.kind === "page.open" ||
      record.kind === "bookmark" ||
      record.kind === "history" ||
      record.kind === "markdown.file" ||
      record.kind === "search.hit"
    ) {
      const url = urlFromRecord(record)
      if (url !== null) {
        currentUrls.push(url)
      }
    }
  }
  flush()
  return batches
}
