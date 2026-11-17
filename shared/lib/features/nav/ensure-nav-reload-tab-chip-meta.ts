/**
 * EN: Fill missing `#t:<id>` chip meta before log rewrite (live picker fields, then tabs.get).
 * JA: ログ書き換え前に欠落 `#t:<id>` チップ meta を埋める（picker live → tabs.get）。
 */

import { findNavReloadTabTokenSpans, type NavReloadTabChipMeta } from "./nav-reload-tab-token.ts"
import {
  normalizeTabFavIconUrl,
  resolveTabFaviconSrc
} from "../tabs/tab-favicon-url.ts"
import {
  resolveLiveTabFavicon,
  resolveLiveTabTitle,
  resolveLiveTabUrl
} from "../tabs/tab-picker-live-tab-fields.ts"

function collectHashTTabIds(texts: readonly string[]): number[] {
  const ids: number[] = []
  const seen = new Set<number>()
  for (const text of texts) {
    for (const span of findNavReloadTabTokenSpans(text)) {
      if (seen.has(span.tabId)) {
        continue
      }
      seen.add(span.tabId)
      ids.push(span.tabId)
    }
  }
  return ids
}

/**
 * EN: Sync fill from picker live fields (seeded on tab -list / browse). Returns still-missing ids.
 * JA: picker live（list/browse 時に seed）から同期で埋める。未解決 id を返す。
 */
export function fillNavReloadTabChipMetaFromLiveFields(
  tabIds: readonly number[],
  metaById: Map<number, NavReloadTabChipMeta>
): number[] {
  const missing: number[] = []
  for (const tabId of tabIds) {
    if (metaById.has(tabId)) {
      continue
    }
    const liveTitle = resolveLiveTabTitle(tabId, "").trim()
    const liveUrl = resolveLiveTabUrl(tabId, "").trim()
    const liveFavicon = resolveLiveTabFavicon(tabId)
    if (liveTitle.length === 0 && liveUrl.length === 0) {
      missing.push(tabId)
      continue
    }
    const title = liveTitle.length > 0 ? liveTitle : "(no title)"
    metaById.set(tabId, {
      title,
      faviconSrc: liveFavicon,
      label: title,
      url: liveUrl
    })
  }
  return missing
}

/**
 * EN: Resolve remaining tab ids via chrome.tabs.get (best-effort; closed tabs stay missing).
 * JA: 残りを chrome.tabs.get で解決（閉じ済みは欠落のまま）。
 */
export async function fillNavReloadTabChipMetaFromChromeTabs(
  tabIds: readonly number[],
  metaById: Map<number, NavReloadTabChipMeta>
): Promise<void> {
  for (const tabId of tabIds) {
    if (metaById.has(tabId)) {
      continue
    }
    try {
      const tab = await chrome.tabs.get(tabId)
      if (metaById.has(tabId)) {
        continue
      }
      const title = (tab.title ?? "").trim() || "(no title)"
      const rawUrl =
        typeof tab.url === "string" && tab.url.trim().length > 0
          ? tab.url.trim()
          : typeof tab.pendingUrl === "string"
            ? tab.pendingUrl.trim()
            : ""
      let faviconSrc: string | null = null
      try {
        faviconSrc = resolveTabFaviconSrc(rawUrl, tab.favIconUrl)
      } catch {
        faviconSrc = normalizeTabFavIconUrl(tab.favIconUrl)
      }
      metaById.set(tabId, {
        title,
        faviconSrc,
        label: title,
        url: rawUrl
      })
    } catch {
      /* EN: Tab may already be closed — leave pending fallback for rewrite. */
    }
  }
}

/**
 * EN: Ensure chip meta for every `#t:<id>` in the texts before rewriting log lines.
 * JA: ログ行書き換え前に、テキスト内の全 `#t:<id>` のチップ meta を確保する。
 */
export async function ensureNavReloadTabChipMetaForTexts(
  texts: readonly string[],
  metaById: Map<number, NavReloadTabChipMeta>
): Promise<void> {
  const tabIds = collectHashTTabIds(texts)
  if (tabIds.length === 0) {
    return
  }
  const stillMissing = fillNavReloadTabChipMetaFromLiveFields(tabIds, metaById)
  if (stillMissing.length === 0) {
    return
  }
  await fillNavReloadTabChipMetaFromChromeTabs(stillMissing, metaById)
}
