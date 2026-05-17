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
  /** `RUN_CMD` を出したペイン（split / exit のスコープ）。 */
  commandSessionId: string
}
