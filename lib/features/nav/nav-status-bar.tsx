type Props = {
  armed: boolean
  active: boolean
  typingMode?: boolean
  typingMultiline?: boolean
  menuOpen?: boolean
  textSelPhase?: "start" | "end" | "done" | "idle" | null
  tabTitle: string | null
  overlayError?: string | null
}

export function NavStatusBar({
  armed,
  active,
  typingMode = false,
  typingMultiline = false,
  menuOpen = false,
  textSelPhase = null,
  tabTitle,
  overlayError = null
}: Props) {
  if (!armed) {
    return null
  }
  const tabLabel =
    overlayError !== null && overlayError.length > 0
      ? `${tabTitle ?? "no tab"} — ${overlayError}`
      : (tabTitle ?? "no tab")
  const textSelPicking = textSelPhase === "start" || textSelPhase === "end"
  const modeLabel = typingMode
    ? "typing"
    : textSelPicking
      ? textSelPhase === "start"
        ? "sel-start"
        : "sel-end"
      : menuOpen
        ? textSelPhase === "done"
          ? "copy"
          : "menu"
        : active
          ? "ON"
          : "OFF (Alt toggles)"
  return (
    <div className="bmxt-mode-status" role="status" aria-live="polite">
      <span className="bmxt-mode-status-seg bmxt-mode-status-seg--label bmxt-mode-status-seg--label-nav">
        nav
      </span>
      <span
        className={`bmxt-mode-status-seg bmxt-mode-status-seg--state${active ? " bmxt-mode-status-seg--on" : ""}`}>
        {modeLabel}
      </span>
      <span className="bmxt-mode-status-seg bmxt-mode-status-seg--meta">{tabLabel}</span>
      <span className="bmxt-mode-status-seg bmxt-mode-status-seg--hint">
        {typingMode
          ? typingMultiline
            ? "BMXt コマンドラインで入力 · Shift+Enter で改行 · Alt 長押しで送信 · Esc 長押しでキャンセル"
            : "BMXt コマンドラインで入力 · Alt 長押しで送信 · Esc 長押しでキャンセル"
          : textSelPicking
            ? textSelPhase === "start"
              ? "↑↓ 移動 · Enter で選択開始 · Esc/Ctrl で取消"
              : "↑↓ 移動 · 範囲プレビュー · Enter で確定 · Esc/Ctrl で取消"
            : textSelPhase === "done"
              ? menuOpen
                ? "コピー · Enter 実行 · Esc で選択解除"
                : "Esc で選択解除"
              : menuOpen
                ? "↑↓ 項目 · Enter 実行 · ←→ 履歴 · Ctrl/Esc で閉じる"
                : "↑↓←→ move · Enter click/type · Ctrl menu · Alt toggle · nav -exit to quit"}
      </span>
    </div>
  )
}
