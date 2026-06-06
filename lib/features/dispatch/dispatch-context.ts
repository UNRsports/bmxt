import type { DomListCapture } from "../dom/dom-list-capture"

/** `applyChromeEffects` が Chrome 操作のために使うコールバック。 */

export type DispatchChromeContext = {
  clearLog: () => Promise<void>
  /** BMXt ウィンドウを閉じてセッションログをクリアする。 */
  exitPane: () => Promise<string[]>
  listWindows: () => Promise<string[]>
  focusInfo: () => Promise<string[]>
  resolveTabArg: (tabIdStr: string | undefined) => Promise<chrome.tabs.Tab | undefined>
  /**
   * EN: Optional override for `dom -list` target tab (tabs picker focus or active window).
   * JA: `dom -list` の対象タブ上書き（tabs ピッカーのフォーカス行またはアクティブタブ）。
   */
  resolveDomListTargetTabId?: () => Promise<number | undefined>
  /** EN: Receives structured DOM picker rows when `dom_list` runs (picker-direct path). */
  onDomListCapture?: (capture: DomListCapture) => void
  /** EN: Throttled progress while `search_page` scans open tabs. */
  onSearchPageProgress?: (message: string) => Promise<void>
  /** EN: Label prefix for progress lines (e.g. `search -list --page`). */
  searchPageProgressLabel?: string
  /** EN: When true, `search_page` stops after the current tab (Ctrl+C / search -exit -list). */
  shouldCancelSearchPage?: () => boolean
  /** `RUN_CMD` を出したペイン（split / exit のスコープ）。 */
  commandSessionId: string
}
