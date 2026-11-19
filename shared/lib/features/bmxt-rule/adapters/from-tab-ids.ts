/**
 * EN: Build bmxtRule stream of `page.open` records from numeric tab ids (chip pipe LHS).
 *     Resolves live tab URLs / group metadata via the tabs API (chips alone carry no URL).
 * JA: 数値 tab id（チップパイプ左辺）から `page.open` ストリームを構築する。
 *     チップ単体に URL は無いので、tabs API で実 URL／グループを解決する。
 */

import {
  BMXT_RULE_SCHEMA,
  type BmxtRuleRecord,
  type BmxtRuleStream
} from "../../bmxt-rule/types.ts"
import { bmxtRuleProducer, bmxtRuleRecord } from "../../bmxt-rule/entries.ts"

export type ResolvedChipTab = {
  tabId: number
  url: string
  pageTitle: string
  /** EN: Chrome group id, or -1 when ungrouped. */
  groupId: number
  groupTitle: string | null
  groupColor: string | null
}

function pushUngroupedMarker(records: BmxtRuleRecord[]): void {
  records.push(
    bmxtRuleRecord("page.group", {
      title: "",
      label: "",
      pageTitle: "",
      url: "",
      ungrouped: true
    })
  )
}

/**
 * EN: Pure builder used by tests and by the tabs-API resolver.
 * JA: テストと tabs API 解決の両方から使う純粋ビルダ。
 */
/**
 * EN: Drop unresolved / empty-URL chip tabs before building the stream.
 *     Producers must never emit `page.open` with an empty url for tab-send.
 * JA: 未解決・空 URL のチップタブはストリームに入れない。
 *     tab-send 向けに空 url の page.open を生産しない。
 */
export function filterResolvedChipTabsWithUrl(
  tabs: readonly ResolvedChipTab[]
): ResolvedChipTab[] {
  const out: ResolvedChipTab[] = []
  for (const tab of tabs) {
    if (typeof tab.url !== "string" || tab.url.trim().length === 0) {
      continue
    }
    out.push({
      ...tab,
      url: tab.url.trim()
    })
  }
  return out
}

export function bmxtRuleStreamFromResolvedTabs(
  tabs: readonly ResolvedChipTab[]
): BmxtRuleStream {
  const usable = filterResolvedChipTabsWithUrl(tabs)
  const records: BmxtRuleRecord[] = []
  let i = 0
  let previousWasGrouped = false

  while (i < usable.length) {
    const head = usable[i]
    if (head === undefined) {
      break
    }
    if (head.groupId >= 0) {
      const groupId = head.groupId
      records.push(
        bmxtRuleRecord("page.group", {
          title: head.groupTitle ?? "",
          label: head.groupTitle ?? "",
          pageTitle: head.groupTitle ?? "",
          color: head.groupColor ?? "grey",
          url: ""
        })
      )
      previousWasGrouped = true
      while (i < usable.length) {
        const tab = usable[i]
        if (tab === undefined || tab.groupId !== groupId) {
          break
        }
        records.push(
          bmxtRuleRecord("page.open", {
            tabId: tab.tabId,
            url: tab.url,
            pageTitle: tab.pageTitle
          })
        )
        i += 1
      }
      continue
    }

    if (previousWasGrouped) {
      pushUngroupedMarker(records)
      previousWasGrouped = false
    }
    while (i < usable.length) {
      const tab = usable[i]
      if (tab === undefined || tab.groupId >= 0) {
        break
      }
      records.push(
        bmxtRuleRecord("page.open", {
          tabId: tab.tabId,
          url: tab.url,
          pageTitle: tab.pageTitle
        })
      )
      i += 1
    }
  }

  return {
    schema: BMXT_RULE_SCHEMA,
    producer: bmxtRuleProducer({
      command: "tab-chip",
      subcommand: "picker"
    }),
    records
  }
}

async function resolveChipTab(tabId: number): Promise<ResolvedChipTab | null> {
  let tab: chrome.tabs.Tab
  try {
    tab = await chrome.tabs.get(tabId)
  } catch {
    return null
  }
  const rawUrl =
    typeof tab.url === "string" && tab.url.trim().length > 0
      ? tab.url.trim()
      : typeof tab.pendingUrl === "string"
        ? tab.pendingUrl.trim()
        : ""
  if (rawUrl.length === 0) {
    return null
  }
  const groupId = typeof tab.groupId === "number" ? tab.groupId : -1
  let groupTitle: string | null = null
  let groupColor: string | null = null
  if (groupId >= 0 && typeof chrome.tabGroups?.get === "function") {
    try {
      const group = await chrome.tabGroups.get(groupId)
      const title = typeof group.title === "string" ? group.title.trim() : ""
      groupTitle = title.length > 0 ? title : null
      groupColor = typeof group.color === "string" ? group.color : "grey"
    } catch {
      groupColor = "grey"
    }
  }
  return {
    tabId,
    url: rawUrl,
    pageTitle: typeof tab.title === "string" ? tab.title.trim() : "",
    groupId,
    groupTitle,
    groupColor
  }
}

export async function bmxtRuleStreamFromTabIds(
  tabIds: readonly number[]
): Promise<BmxtRuleStream> {
  const resolved: ResolvedChipTab[] = []
  for (const tabId of tabIds) {
    const tab = await resolveChipTab(tabId)
    if (tab !== null) {
      resolved.push(tab)
    }
  }
  return bmxtRuleStreamFromResolvedTabs(resolved)
}
