/**
 * EN: Process-scoped gate — after Esc dismiss, prompt candidate menus stay closed
 *     until Tab explicitly requests them again (all terminal sessions share this).
 * JA: プロセス共通。Esc で候補を閉じたあと、Tab で明示表示するまでどのセッションでも自動表示しない。
 */

let suppressedUntilTab = false

/** EN: Esc (or equivalent) dismissed the candidate menu. */
export function markCandidateMenuSuppressedUntilTab(): void {
  suppressedUntilTab = true
}

/** EN: Tab (or an intentional command-driven open) may show candidates again. */
export function clearCandidateMenuSuppressedUntilTab(): void {
  suppressedUntilTab = false
}

export function isCandidateMenuSuppressedUntilTab(): boolean {
  return suppressedUntilTab
}
