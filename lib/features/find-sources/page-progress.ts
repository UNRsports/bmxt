export type FindPageProgress = {
  phase: "start" | "tick" | "done"
  tabIndex: number
  tabTotal: number
  scanned: number
  skipped: number
}

/** EN: Log line for find --page / find --none page scan progress. */
export function formatFindPageProgress(label: string, p: FindPageProgress): string {
  if (p.phase === "start") {
    return `${label} — scanning visible text in ${p.tabTotal} open http(s) tab(s)…`
  }
  if (p.phase === "done") {
    return `${label} — finished (${p.scanned} read, ${p.skipped} skipped, ${p.tabTotal} checked)`
  }
  return `${label} — ${p.tabIndex}/${p.tabTotal} tab(s) checked (${p.scanned} read, ${p.skipped} skipped)`
}

export function findPageProgressLabel(dispatchLine: string): string {
  const t = dispatchLine.trim().toLowerCase()
  if (t.includes("find --none")) {
    return "find --none (pages)"
  }
  if (t.includes("find -list") && t.includes("--none")) {
    return "find -list --none (pages)"
  }
  if (t.includes("find -list") && t.includes("--page")) {
    return "find -list --page"
  }
  return "find --page"
}

/** EN: Emit at start, every `stride` tabs, and at end — avoid log spam. */
export function shouldEmitFindPageProgress(
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
