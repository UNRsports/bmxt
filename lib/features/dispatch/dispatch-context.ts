/** `applyChromeEffects` が Chrome 操作のために使うコールバック。 */

export type DispatchChromeContext = {
  clearLog: () => Promise<void>
  /** Clear session log and close the BMXt window. */
  exitBmxt: () => Promise<string[]>
  listWindows: () => Promise<string[]>
  focusInfo: () => Promise<string[]>
  resolveTabArg: (tabIdStr: string | undefined) => Promise<chrome.tabs.Tab | undefined>
}
