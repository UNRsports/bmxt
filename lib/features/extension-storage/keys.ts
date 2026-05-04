/**
 * chrome.storage.local で BMXt が共有するキーと上限。
 * Service Worker（background）と BMXt タブ UI の両方から参照する。
 */

export const SESSION_LOG_KEY = "bmxt_log"
/** マルチペインのレイアウト＋各ペインログ（`lib/features/split`）。 */
export const SPLIT_SESSION_KEY = "bmxt_split_session"
export const CMD_HISTORY_KEY = "bmxt_cmd_history"
export const LAST_NORMAL_WINDOW_KEY = "bmxt_last_normal_window"

/** BMXt UI ウィンドウ ID（SW 再起動後もフォーカスできるよう background が保持）。 */
export const BMXT_WINDOW_ID_KEY = "bmxt_shell_window_id"

export const MAX_SESSION_LOG_LINES = 500
export const MAX_CMD_HISTORY_LINES = 300
