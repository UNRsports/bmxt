/**
 * EN: Nav context-menu metadata (handlers live in `nav-overlay-inject-fn.ts` by `id`).
 * JA: nav メニュー定義。実行は注入側の `id` スイッチと同期すること。
 */

export type NavMenuItemId = "selectText" | "saveImage" | "reloadPage"

export type NavMenuCopyItemId = "copySelection"

export type NavMenuItemMeta = {
  id: NavMenuItemId
  /** JA: Menu row label */
  label: string
  /** EN: Shown on the row for item selection */
  selectHint: string
}

export type NavMenuCopyItemMeta = {
  id: NavMenuCopyItemId
  label: string
  selectHint: string
}

/** EN: Main menu rows (extensible). Order = ↑↓ cycle order. */
export const NAV_MENU_ITEMS: NavMenuItemMeta[] = [
  { id: "selectText", label: "テキスト選択", selectHint: "↑↓ · Enter" },
  { id: "saveImage", label: "カーソル下の画像を保存", selectHint: "↑↓ · Enter" },
  { id: "reloadPage", label: "ページを再読み込み", selectHint: "↑↓ · Enter" }
]

/** EN: Shown after start/end are set (copy only for now). */
export const NAV_MENU_COPY_ITEMS: NavMenuCopyItemMeta[] = [
  { id: "copySelection", label: "コピー", selectHint: "Enter" }
]

export const NAV_MENU_HISTORY_ROWS = [
  { id: "historyBack" as const, label: "履歴を戻る", keyHint: "←" },
  { id: "historyForward" as const, label: "履歴を進む", keyHint: "→" }
]

export type NavTextSelPhase = "idle" | "start" | "end" | "done"
