import type { DomListCapture } from "../dom/dom-list-capture"
import type { SessionPatch } from "../bmxt-window/terminal-sessions/session-patches"
import type { UiLocale } from "../setting/locale"
import type { BmxtHostKind } from "../bmxt-window/bmxt-host-kind"
import type { HostSwitchSnapshot } from "../bmxt-float/host-switch-snapshot"

/** `applyChromeEffects` が Chrome 操作のために使うコールバック。 */

export type DispatchChromeContext = {
  /** EN: Collect session mutations for the UI to apply (SW does not own session state). */
  enqueueSessionPatch: (patch: SessionPatch) => void
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
  /** EN: When true, `search_page` reads full innerText ( `--unlimit` ). */
  searchPageUnlimit?: boolean
  /** EN: Throttled progress while `search_page` scans open tabs. */
  onSearchPageProgress?: (message: string) => Promise<void>
  /**
   * EN: Structured page-scan progress for the prompt busy overall indicator.
   * JA: プロンプト上ビジーの全体進捗用（ページ走査の構造化進捗）。
   */
  onSearchPageProgressInfo?: (progress: import("../search/sources/page-progress").SearchPageProgress) => void | Promise<void>
  /** EN: Label prefix for progress lines (e.g. `search -list --page`). */
  searchPageProgressLabel?: string
  /** EN: Generic cooperative cancel for long-running effects (job runner). */
  shouldCancel?: () => boolean
  /** EN: When true, `search_page` stops after the current tab (Ctrl+C / search -exit -list). */
  shouldCancelSearchPage?: () => boolean
  /** `RUN_CMD` を出したペイン（split / exit のスコープ）。 */
  commandSessionId: string
  /** EN: UI display locale from settings picker / storage (defaults to Japanese). */
  uiLocale?: UiLocale
  /** EN: Which UI host issued RUN_CMD (`switchwindow` / `exit`). */
  hostKind?: BmxtHostKind
  /** EN: Sessions/browse snapshot from the UI (host-blind; used by `switch_window`). */
  hostSnapshot?: HostSwitchSnapshot
  /** EN: Float iframe hosting tab id. */
  floatTabId?: number
  /** EN: Tab id from the message sender when available. */
  senderTabId?: number
  /** EN: Show in-page float; returns false when CS unreachable. */
  showFloatOnTab?: (tabId: number) => Promise<boolean>
  /** EN: Hide float and clear per-tab sessions after switch to popup. */
  hideFloatAfterSwitch?: (tabId: number) => Promise<void>
  /** EN: Close popup window after migrating to float (no SESSION_CLEAR needed on closed UI). */
  closePopupAfterSwitch?: () => Promise<void>
  /** EN: Open or focus the BMXt popup after migrating from float. */
  openOrFocusPopupAfterSwitch?: () => Promise<void>
}
