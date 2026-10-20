/** EN: Single source for tab title/url/favicon shown in the picker (decoupled from row rebuilds). */

import { normalizeTabFavIconUrl } from "./tab-favicon-url.ts"

export type TabPickerLiveTabFields = {
  title: string
  url: string
  faviconSrc: string | null
}

const committed = new Map<number, TabPickerLiveTabFields>()
const pending = new Map<number, Partial<TabPickerLiveTabFields>>()
const debounceTimers = new Map<number, ReturnType<typeof setTimeout>>()

let revision = 0
const listeners = new Set<() => void>()

/** EN: Trailing debounce — SPA title/url churn commits once after events settle. */
const COMMIT_DEBOUNCE_MS = 300

function notify(): void {
  revision += 1
  for (const listener of listeners) {
    listener()
  }
}

export function subscribeTabPickerLiveTabFields(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getTabPickerLiveTabFieldsRevision(): number {
  return revision
}

function commitTabFields(tabId: number): void {
  const patch = pending.get(tabId)
  if (patch === undefined) {
    return
  }
  pending.delete(tabId)

  const prev = committed.get(tabId) ?? { title: "", url: "", faviconSrc: null }
  const next: TabPickerLiveTabFields = {
    title: patch.title ?? prev.title,
    url: patch.url ?? prev.url,
    faviconSrc: patch.faviconSrc !== undefined ? patch.faviconSrc : prev.faviconSrc
  }

  if (
    next.title === prev.title &&
    next.url === prev.url &&
    next.faviconSrc === prev.faviconSrc
  ) {
    return
  }
  committed.set(tabId, next)
  notify()
}

function scheduleCommit(tabId: number): void {
  const prevTimer = debounceTimers.get(tabId)
  if (prevTimer !== undefined) {
    clearTimeout(prevTimer)
  }
  debounceTimers.set(
    tabId,
    setTimeout(() => {
      debounceTimers.delete(tabId)
      commitTabFields(tabId)
    }, COMMIT_DEBOUNCE_MS)
  )
}

/** EN: Apply `tabs.onUpdated` display fields; does not touch picker row state. */
export function applyTabPickerLiveFieldsFromChrome(
  tabId: number,
  changeInfo: chrome.tabs.TabChangeInfo
): void {
  const patch: Partial<TabPickerLiveTabFields> = {}
  if (changeInfo.title !== undefined) {
    patch.title = changeInfo.title
  }
  if (changeInfo.url !== undefined) {
    patch.url = changeInfo.url
  }
  if (changeInfo.favIconUrl !== undefined) {
    patch.faviconSrc = normalizeTabFavIconUrl(changeInfo.favIconUrl)
  }
  if (
    patch.title === undefined &&
    patch.url === undefined &&
    patch.faviconSrc === undefined
  ) {
    return
  }

  const prevPending = pending.get(tabId)
  pending.set(tabId, { ...prevPending, ...patch })
  scheduleCommit(tabId)
}

/** EN: Seed from `tabs.query` on row build when no live entry exists yet. */
export function seedTabPickerLiveFields(
  tabId: number,
  title: string,
  url: string,
  faviconSrc: string | null = null
): void {
  if (committed.has(tabId) || pending.has(tabId)) {
    return
  }
  committed.set(tabId, { title, url, faviconSrc })
  notify()
}

export function forgetTabPickerLiveFields(tabId: number): void {
  committed.delete(tabId)
  pending.delete(tabId)
  const timer = debounceTimers.get(tabId)
  if (timer !== undefined) {
    clearTimeout(timer)
  }
  debounceTimers.delete(tabId)
  notify()
}

export function clearTabPickerLiveFields(): void {
  committed.clear()
  pending.clear()
  for (const timer of debounceTimers.values()) {
    clearTimeout(timer)
  }
  debounceTimers.clear()
  notify()
}

function fieldsForTab(tabId: number): TabPickerLiveTabFields | undefined {
  return committed.get(tabId)
}

/** EN: Title for display/search — committed live value, else row/query fallback. */
export function resolveLiveTabTitle(tabId: number, fallback: string): string {
  const live = fieldsForTab(tabId)
  if (live !== undefined && live.title !== "") {
    return live.title
  }
  return fallback
}

/** EN: URL for display/search — committed live value, else row/query fallback. */
export function resolveLiveTabUrl(tabId: number, fallback: string): string {
  const live = fieldsForTab(tabId)
  if (live !== undefined && live.url !== "") {
    return live.url
  }
  return fallback
}

/** EN: Favicon src from live store (Firefox path); null when unset. */
export function resolveLiveTabFavicon(tabId: number): string | null {
  const live = fieldsForTab(tabId)
  if (live === undefined) {
    return null
  }
  return live.faviconSrc
}
