/** `applyChromeEffects` が Chrome 操作のために使うコールバック。 */

export type DispatchChromeContext = {
  clearLog: () => Promise<void>
  /** 最後のペインならウィンドウを閉じる。 */
  exitPane: () => Promise<string[]>
  splitRow: () => Promise<string[]>
  splitCol: () => Promise<string[]>
  listWindows: () => Promise<string[]>
  focusInfo: () => Promise<string[]>
  resolveTabArg: (tabIdStr: string | undefined) => Promise<chrome.tabs.Tab | undefined>
}
