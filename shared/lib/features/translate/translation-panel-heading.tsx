import type { BilingualUiLabel } from "./translation-pair"
import { pickUiLabel } from "../setting/locale"
import { useUiLocale } from "../setting/use-ui-settings"

type Props = {
  label: BilingualUiLabel
  className: string
}

/** EN: Panel title — single locale line from UI settings (settings picker). */
export function TranslationPanelHeading({ label, className }: Props) {
  const locale = useUiLocale()
  const text = pickUiLabel(label, locale)
  return (
    <div className={className}>
      <span
        className={
          locale === "en"
            ? "bmxt-translate-panel-heading-en"
            : "bmxt-translate-panel-heading-ja"
        }
        lang={locale === "en" ? "en" : "ja"}>
        {text}
      </span>
    </div>
  )
}
