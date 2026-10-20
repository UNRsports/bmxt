import { translateStatusHint, translateStatusMeta } from "../setting/i18n/resolvers"
import { useUiLocale } from "../setting/use-ui-settings"
import { getTranslationPairDef, type TranslationPairId } from "./translation-pair"

type Props = {
  pairId: TranslationPairId
  navTypingAssist: boolean
  navTypingMultiline?: boolean
  busy?: boolean
  statusNote?: string | null
}

export function TranslateStatusBar({
  pairId,
  navTypingAssist,
  navTypingMultiline = false,
  busy = false,
  statusNote = null
}: Props) {
  const locale = useUiLocale()
  const pairLabel = getTranslationPairDef(pairId).statusLabel
  const meta = translateStatusMeta(locale, busy, navTypingAssist, statusNote)
  const hint = translateStatusHint(locale, pairId, navTypingAssist, navTypingMultiline)

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
