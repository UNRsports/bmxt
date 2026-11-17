/**
 * EN: Contract helpers for `#t:<id>… | tab -send <deviceId>` (picker Family send path).
 *     Keeps producer (chip → page.open with URLs) and consumer (url batches) aligned in tests.
 * JA: `#t:<id>… | tab -send <deviceId>`（picker Family 送信）の契約ヘルパ。
 *     生産（チップ→URL 付き page.open）と消費（url バッチ）をテストで揃える。
 */

import {
  bmxtRuleStreamFromResolvedTabs,
  type ResolvedChipTab
} from "../../../bmxt-rule/adapters/from-tab-ids.ts"
import type { BmxtRuleStream } from "../../../bmxt-rule/types.ts"
import { parseTabChipProducerSegment } from "../producers/tab-chip-producer.ts"
import {
  urlBatchesFromBmxtRuleStream,
  type SyncOpenUrlBatch
} from "./sync-open-batches.ts"
import { parseTabSendPipeConsumer } from "./tab-send-match.ts"

export type TabChipSendContractResult = {
  chipIds: number[]
  deviceId: string
  closeAfter: boolean
  stream: BmxtRuleStream
  batches: SyncOpenUrlBatch[]
  sendableUrlCount: number
}

/**
 * EN: Simulate picker Family send: chip LHS + `tab -send` RHS + resolved tab rows.
 * JA: picker Family 送信を模擬: チップ左辺 + `tab -send` 右辺 + 解決済みタブ行。
 */
export function evaluateTabChipSendContract(args: {
  chipSegment: string
  sendSegment: string
  resolvedTabs: readonly ResolvedChipTab[]
}): TabChipSendContractResult | null {
  const chipIds = parseTabChipProducerSegment(args.chipSegment)
  if (chipIds === null) {
    return null
  }
  const send = parseTabSendPipeConsumer(args.sendSegment)
  if (send === null) {
    return null
  }
  const byId = new Map<number, ResolvedChipTab>()
  for (const tab of args.resolvedTabs) {
    byId.set(tab.tabId, tab)
  }
  const ordered: ResolvedChipTab[] = []
  for (const id of chipIds) {
    const tab = byId.get(id)
    if (tab !== undefined) {
      ordered.push(tab)
    }
  }
  const stream = bmxtRuleStreamFromResolvedTabs(ordered)
  const batches = urlBatchesFromBmxtRuleStream(stream)
  let sendableUrlCount = 0
  for (const batch of batches) {
    sendableUrlCount += batch.urls.length
  }
  return {
    chipIds,
    deviceId: send.deviceId,
    closeAfter: send.closeAfter,
    stream,
    batches,
    sendableUrlCount
  }
}

/** EN: Every page.open in the stream must carry a non-empty url. */
export function pageOpenRecordsMissingUrl(stream: BmxtRuleStream): number {
  let missing = 0
  for (const record of stream.records) {
    if (record.kind !== "page.open") {
      continue
    }
    let url: string | null = null
    for (const [key, value] of record.entries) {
      if (key === "url" && typeof value === "string") {
        url = value.trim()
        break
      }
    }
    if (url === null || url.length === 0) {
      missing += 1
    }
  }
  return missing
}
