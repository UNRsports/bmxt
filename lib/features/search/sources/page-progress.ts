export type SearchPageProgress = {
  phase: "start" | "tick" | "done"
  tabIndex: number
  tabTotal: number
  scanned: number
  skipped: number
}

/** EN: Progress line for `search -list --page` tab scan. */
export function formatSearchPageProgress(label: string, p: SearchPageProgress): string {
  if (p.phase === "start") {
    return `${label} — scanning visible text in ${p.tabTotal} open http(s) tab(s)…`
  }
  if (p.phase === "done") {
    return `${label} — finished (${p.scanned} read, ${p.skipped} skipped, ${p.tabTotal} checked)`
  }
  return `${label} — ${p.tabIndex}/${p.tabTotal} tab(s) checked (${p.scanned} read, ${p.skipped} skipped)`
}

export function searchPageProgressLabel(dispatchLine: string): string {
  const t = dispatchLine.trim().toLowerCase()
  if (t.includes("search -list") && t.includes("--history")) {
    return "search -list --history"
  }
  if (t.includes("search -list") && t.includes("--bookmark")) {
    return "search -list --bookmark"
  }
  if (t.includes("search -list") && t.includes("--page")) {
    return "search -list --page"
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
