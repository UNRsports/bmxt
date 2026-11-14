import type { DomListCapture } from "../dom/dom-list-capture"
import type { SessionPatch } from "../bmxt-window/terminal-sessions/session-patches"
import type { UiLocale } from "../setting/locale"

/** `applyHostEffects` がホスト操作のために使うコールバック。 */

export type DispatchHostContext = {
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
  /**
   * EN: Parent-job cooperative cancel. All long-running search (and other) effects
   *     must honor this — options inherit the first-command job flag.
   * JA: 親ジョブの協調キャンセル。長時間 effect はすべてこれを見る（第一コマンドのフラグを継承）。
   */
  shouldCancel?: () => boolean
  /** `RUN_CMD` を出したペイン（split / exit のスコープ）。 */
  commandSessionId: string
  /** EN: UI display locale from settings picker / storage (defaults to Japanese). */
  uiLocale?: UiLocale
}
