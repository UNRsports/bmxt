import type { UiLocale } from "../../setting/locale.ts"
import { DEFAULT_UI_LOCALE } from "../../setting/locale.ts"
import { tSearch } from "../../setting/i18n/ns/search.ts"

export type SearchPageProgress = {
  phase: "start" | "tick" | "done"
  tabIndex: number
  tabTotal: number
  scanned: number
  skipped: number
}

/** EN: Progress line for `search -list --page` tab scan. */
export function formatSearchPageProgress(
  label: string,
  p: SearchPageProgress,
  locale: UiLocale = DEFAULT_UI_LOCALE
): string {
  const params = {
    label,
    tabIndex: String(p.tabIndex),
    tabTotal: String(p.tabTotal),
    scanned: String(p.scanned),
    skipped: String(p.skipped)
  }
  if (p.phase === "start") {
    return tSearch("search.pageProgress.start", locale, params)
  }
  if (p.phase === "done") {
    return tSearch("search.pageProgress.done", locale, params)
  }
  return tSearch("search.pageProgress.tick", locale, params)
}

export function searchPageProgressLabel(dispatchLine: string): string {
  const t = dispatchLine.trim().toLowerCase()
  if (t.includes("search -list") && t.includes("--all")) {
    return "search -list --all"
  }
  if (t.includes("search -list") && t.includes("--history")) {
    return "search -list --history"
  }
  if (t.includes("search -list") && t.includes("--bookmark")) {
    return "search -list --bookmark"
  }
  if (t.includes("search -list") && t.includes("--page")) {
    return "search -list --page"
  }
  if (t.includes("search -list") && t.includes("--snapshot")) {
    return "search -list --snapshot"
  }
  return "search -list"
}

/** EN: Emit at start, every `stride` tabs, and at end — avoid log spam. */
export function shouldEmitSearchPageProgress(
  tabIndex: number,
  tabTotal: number,
  stride = 4
): boolean {
  if (tabIndex <= 0) {
    return true
  }
  if (tabIndex >= tabTotal) {
    return true
  }
  return tabIndex % stride === 0
}
