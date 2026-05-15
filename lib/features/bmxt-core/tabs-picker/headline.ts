export type HeadlineContext = {
  bulkSubMode?: string | null
  groupNewPhase?: string
  variant?: string
  editPanelKind?: string | null
}

function commonParts(): string[] {
  return [
    "↑↓ move",
    "Shift+↑↓ range #",
    "Tab #",
    ": コマンド（move/close/group/nw/nt/edit · Tab 補完）",
    "/ highlight · Enter commit · :nohlsearch clears",
    "Ctrl+Shift+↑↓ active preview",
    "Enter confirm",
    "Esc clear # / exit"
  ]
}

export function resolveHeadline(ctx: HeadlineContext): string {
  const bulkSubMode = ctx.bulkSubMode ?? null
  const groupNewPhase = ctx.groupNewPhase ?? "tabs"
  const variant = ctx.variant ?? "default"
  const editPanelKind = ctx.editPanelKind ?? null

  if (bulkSubMode === "group" && groupNewPhase === "meta") {
    return "Tab picker — [GROUP] 新規 · 名前・色 · Enter 確定 · Esc でターゲット一覧へ · Tab 名前↔色"
  }
  if (variant === "groupNew" && groupNewPhase === "meta") {
    return "group new — 名前・色 · Enter 確定 · Esc タブ一覧へ · Tab 名前↔色"
  }
  if (variant === "groupNew" && groupNewPhase === "tabs") {
    return "group new — ↑↓ ハイライト · Tab で選択 · Enter で名前・色 · / 文字ハイライト · Esc"
  }

  const parts = commonParts().join(" · ")
  switch (bulkSubMode) {
    case "move":
      return `Tab picker — [MOVE] ↑↓ dest · Enter apply · ${parts}`
    case "close":
      return `Tab picker — [CLOSE] Enter でウィンドウを閉じる / タブを閉じる · ${parts}`
    case "newTab":
      return `Tab picker — [NEW TAB] Enter で URL 入力 · ${parts}`
    case "group":
      return `Tab picker — [GROUP] ↑↓ 既存 or 新規 · Enter · ${parts}`
    case "newWindow":
      return `Tab picker — [NEW WINDOW] Enter move # tabs to new window · ${parts}`
    case "edit":
      if (editPanelKind === "windowRename") {
        return `Tab picker — [EDIT] ウィンドウ名 · Enter 確定 · Esc キャンセル · ${parts}`
      }
      if (editPanelKind === "groupRename") {
        return `Tab picker — [EDIT] グループ名 · Enter 確定 · Esc で操作一覧へ · ${parts}`
      }
      if (editPanelKind === "groupMenu") {
        return `Tab picker — [EDIT] ↑↓ 操作選択 · Enter 実行 · Esc キャンセル · ${parts}`
      }
      return `Tab picker — [EDIT] · ${parts}`
    default:
      return `Tab picker — ${parts}`
  }
}

export function resolveTabsPickerHeadline(context: HeadlineContext): string {
  return resolveHeadline(context)
}
