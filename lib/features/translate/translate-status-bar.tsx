import { getTranslationPairDef, type TranslationPairId } from "./translation-pair"

type Props = {
  pairId: TranslationPairId
  navTypingAssist: boolean
  navTypingMultiline?: boolean
  busy?: boolean
  statusNote?: string | null
}

function navCommitHint(pairId: TranslationPairId, multiline: boolean): string {
  const commitHint =
    getTranslationPairDef(pairId).commitLanguage === "en"
      ? "Alt 長押しで英訳を送信"
      : "Alt 長押しで和訳を送信"
  const base = `nav typing · 入力停止500msで 訳 · ${commitHint}`
  return multiline ? `${base} · Shift+Enter で改行` : base
}

export function TranslateStatusBar({
  pairId,
  navTypingAssist,
  navTypingMultiline = false,
  busy = false,
  statusNote = null
}: Props) {
  const pairLabel = getTranslationPairDef(pairId).statusLabel

  const meta =
    statusNote !== null && statusNote.length > 0
      ? statusNote
      : busy
        ? "translating…"
        : navTypingAssist
          ? "nav typing assist"
          : "assist ON"

  const hint = navTypingAssist
    ? navCommitHint(pairId, navTypingMultiline)
    : `translate -off to disable · ${pairLabel} · nav typing で訳 · 入力停止500msで 訳`

  return (
    <div className="bmxt-mode-status" role="status" aria-live="polite">
      <span className="bmxt-mode-status-seg bmxt-mode-status-seg--label bmxt-mode-status-seg--label-translate">
        translate
      </span>
      <span className="bmxt-mode-status-seg bmxt-mode-status-seg--state bmxt-mode-status-seg--on">
        ON
      </span>
      <span className="bmxt-mode-status-seg bmxt-mode-status-seg--meta">{pairLabel}</span>
      <span className="bmxt-mode-status-seg bmxt-mode-status-seg--meta">{meta}</span>
      <span className="bmxt-mode-status-seg bmxt-mode-status-seg--hint">{hint}</span>
    </div>
  )
}
