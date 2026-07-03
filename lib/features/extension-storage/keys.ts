/**
 * chrome.storage.local で BMXt が共有するキーと上限。
 * Service Worker（background）と BMXt タブ UI の両方から参照する。
 */

/** 旧単一ログキー（`TERMINAL_SESSIONS_KEY` へ移行後は未使用）。 */
export const SESSION_LOG_KEY = "bmxt_log"

/** 複数ターミナル: ログ + セッション順 + アクティブ ID（v4）。 */
export const TERMINAL_SESSIONS_KEY = "bmxt_terminal_sessions_v1"

/** 移行のみ: 旧 v2 と併用していたフォーカス ID。 */
export const ACTIVE_TERMINAL_SESSION_KEY = "bmxt_active_terminal_session"

/** 移行のみ: 旧 split ツリー + フォーカス中リーフ ID。 */
export const SPLIT_LAYOUT_KEY = "bmxt_split_layout_v1"

export const CMD_HISTORY_KEY = "bmxt_cmd_history"
export const LAST_NORMAL_WINDOW_KEY = "bmxt_last_normal_window"

/** BMXt UI ウィンドウ ID（SW 再起動後もフォーカスできるよう background が保持）。 */
export const BMXT_WINDOW_ID_KEY = "bmxt_shell_window_id"

/** タブピッカー用: Chrome ウィンドウ ID → ユーザー定義の表示名。 */
export const WINDOW_DISPLAY_NAMES_KEY = "bmxt_window_display_names_v1"

/** ユーザーが最後にリリースノートを見た拡張機能バージョン（`manifest.json` / package の version と一致）。 */
export const LAST_SEEN_EXTENSION_VERSION_KEY = "bmxt_last_seen_extension_version"

/** インストール／更新時に welcome ページを最後に自動表示した拡張機能バージョン。 */
export const LAST_SEEN_WELCOME_VERSION_KEY = "bmxt_last_seen_welcome_version"

/** Nav typing / translate editor — Chrome 内蔵 Translator（ja↔en 往復表示）。 */
export const TYPING_TRANSLATE_KEY = "bmxt_typing_translate_v1"

/** Tab picker: collapsed window / group tree per session (`exit` full close until persisted). */
export const TAB_PICKER_FOLD_STATE_KEY = "bmxt_tab_picker_fold_v1"

/** Tab picker: page-active preview mode (`--auto` / `--manual`). */
export const TABS_PICKER_SETTINGS_KEY = "bmxt_tabs_picker_settings_v1"

/** Search list picker: page-active preview mode (`--auto` / `--manual`). */
export const SEARCH_PICKER_SETTINGS_KEY = "bmxt_search_picker_settings_v1"

/** DOM list picker: page-active jump preview mode (`--auto` / `--manual`). */
export const DOM_PICKER_SETTINGS_KEY = "bmxt_dom_picker_settings_v1"

/** @deprecated Legacy SQLite blob — removed; cleared via settings reset. */
export const SEARCH_CACHE_DB_KEY = "bmxt_search_cache_db_v1"

/** @deprecated Migrated into `SEARCH_CACHE_DB_KEY`. */
export const SEARCH_CACHE_HISTORY_KEY = "bmxt_search_cache_history_v1"

/** @deprecated Migrated into `SEARCH_CACHE_DB_KEY`. */
export const SEARCH_CACHE_BOOKMARK_KEY = "bmxt_search_cache_bookmark_v1"

/** @deprecated Migrated into `SEARCH_CACHE_DB_KEY`. */
export const SEARCH_CACHE_PAGE_KEY = "bmxt_search_cache_page_v1"

/** Global UI: display locale and terminal appearance. */
export const UI_SETTINGS_KEY = "bmxt_ui_settings_v1"

/** UI settings storage mode (internal chrome.storage vs external directory). */
export const UI_SETTINGS_STORAGE_CONFIG_KEY = "bmxt_ui_settings_storage_v1"

/** Saved page snapshots (Markdown); mirrors UI settings storage mode. */
export const SNAPSHOTS_STORAGE_KEY = "bmxt_snapshots_v1"

/** Snapshot destination: bundled with UI settings vs separate Obsidian vault folder. */
export const SNAPSHOT_STORAGE_CONFIG_KEY = "bmxt_snapshot_storage_v1"

/** Max Markdown body characters per snapshot (internal storage). */
export const MAX_SNAPSHOT_BODY_CHARS = 200_000

/** Max snapshot files kept in internal storage. */
export const MAX_INTERNAL_SNAPSHOT_FILES = 500

/** Per-leaf picker columns + pane focus (cleared on last-pane `exit` or BMXt window close). */
export const PROCESS_UI_STATE_KEY = "bmxt_process_ui_v1"

/** @deprecated Legacy SQLite blob — removed; in-memory job audit only. */
export const JOB_DB_KEY = "bmxt_job_db_v1"

export const MAX_SESSION_LOG_LINES = 5000
export const MAX_CMD_HISTORY_LINES = 300
