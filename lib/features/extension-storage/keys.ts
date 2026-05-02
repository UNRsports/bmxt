/**
 * chrome.storage.local で BMXt が共有するキーと上限。
 * Service Worker（background）と BMXt タブ UI の両方から参照する。
 */

export const SESSION_LOG_KEY = "bmxt_log"
export const CMD_HISTORY_KEY = "bmxt_cmd_history"
export const LAST_NORMAL_WINDOW_KEY = "bmxt_last_normal_window"

export const MAX_SESSION_LOG_LINES = 500
export const MAX_CMD_HISTORY_LINES = 300
