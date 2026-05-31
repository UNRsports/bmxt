import type { BilingualUiLabel } from "./translation-pair"

type Props = {
  label: BilingualUiLabel
  className: string
}

/** EN: Panel title — Japanese line + English subline (pair-specific language tags). */
export function TranslationPanelHeading({ label, className }: Props) {
  return (
    <div className={className}>
      <span className="bmxt-translate-panel-heading-ja">{label.ja}</span>
      <span className="bmxt-translate-panel-heading-en" lang="en">
        {label.en}
      </span>
    </div>
  )
}
