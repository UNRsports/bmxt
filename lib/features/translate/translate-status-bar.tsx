type Props = {
  editorOpen: boolean
  editorFocused: boolean
  navTypingAssist: boolean
  navTypingMultiline?: boolean
  busy?: boolean
  statusNote?: string | null
}

export function TranslateStatusBar({
  editorOpen,
  editorFocused,
  navTypingAssist,
  navTypingMultiline = false,
  busy = false,
  statusNote = null
}: Props) {
  const meta =
    statusNote !== null && statusNote.length > 0
      ? statusNote
      : busy
        ? "translating…"
        : editorFocused
          ? "editor · focused"
          : editorOpen
            ? "editor open"
            : navTypingAssist
              ? "nav typing assist"
              : "assist ON"

  const hint = navTypingAssist
    ? navTypingMultiline
      ? "nav typing · 入力停止500msで 訳/再訳 · Shift+Enter で改行 · Alt 長押しで英訳を送信"
      : "nav typing · 入力停止500msで 訳/再訳 · Alt 長押しで英訳を送信"
    : editorFocused
      ? "Esc → prompt · translate -off to close · 入力停止500msで 訳/再訳"
      : editorOpen
        ? "Ctrl+←/→ で editor · Esc → prompt · translate -off to close"
        : "translate -off to disable · nav typing でもアシスト · 入力停止500msで 訳/再訳"

  return (
    <div className="bmxt-mode-status" role="status" aria-live="polite">
      <span className="bmxt-mode-status-seg bmxt-mode-status-seg--label bmxt-mode-status-seg--label-translate">
        translate
      </span>
      <span className="bmxt-mode-status-seg bmxt-mode-status-seg--state bmxt-mode-status-seg--on">
        ON
      </span>
      <span className="bmxt-mode-status-seg bmxt-mode-status-seg--meta">{meta}</span>
      <span className="bmxt-mode-status-seg bmxt-mode-status-seg--hint">{hint}</span>
    </div>
  )
}
