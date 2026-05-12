/**
 * chrome.storage.local で BMXt が共有するキーと上限。
 * Service Worker（background）と BMXt タブ UI の両方から参照する。
 */

/** 旧単一ログキー（`TERMINAL_SESSIONS_KEY` へ移行後は未使用）。 */
export const SESSION_LOG_KEY = "bmxt_log"

/** 複数ターミナル: ログ本体（v2 オブジェクト。フォーカス中セッション ID は `ACTIVE_TERMINAL_SESSION_KEY`）。 */
export const TERMINAL_SESSIONS_KEY = "bmxt_terminal_sessions_v1"

/** フォーカス中のターミナルセッション ID（ログ本体と分離して RMW 競合を避ける）。 */
export const ACTIVE_TERMINAL_SESSION_KEY = "bmxt_active_terminal_session"
export const CMD_HISTORY_KEY = "bmxt_cmd_history"
export const LAST_NORMAL_WINDOW_KEY = "bmxt_last_normal_window"

/** BMXt UI ウィンドウ ID（SW 再起動後もフォーカスできるよう background が保持）。 */
export const BMXT_WINDOW_ID_KEY = "bmxt_shell_window_id"

/** ユーザーが最後にリリースノートを見た拡張機能バージョン（`manifest.json` / package の version と一致）。 */
export const LAST_SEEN_EXTENSION_VERSION_KEY = "bmxt_last_seen_extension_version"

export const MAX_SESSION_LOG_LINES = 500
export const MAX_CMD_HISTORY_LINES = 300
