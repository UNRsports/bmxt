import { searchStatusHint, useUiLocale } from "../setting"
import {
  settingTokenForSearchPageActiveMode,
  type SearchPageActiveMode
} from "./page-active-setting"

type Props = {
  pattern?: string
  phase?: "loading" | "results"
  pageActiveMode: SearchPageActiveMode
}

/** EN: Detail bar for the search list picker. */
export function SearchStatusBar({ pattern, phase, pageActiveMode }: Props) {
  const locale = useUiLocale()
  const modeToken = settingTokenForSearchPageActiveMode(pageActiveMode)
  const stateLabel = pageActiveMode === "auto" ? "auto" : "manual"
  const patternMeta =
    pattern && pattern.length > 0
      ? pattern.length > 48
        ? `${pattern.slice(0, 48)}…`
        : pattern
      : locale === "ja"
        ? "（パターンなし）"
        : "(no pattern)"
  const phasePrefix = phase === "loading" ? (locale === "ja" ? "loading · " : "loading · ") : ""
  const meta = `${phasePrefix}page-active ${modeToken} · ${patternMeta}`

  return (
    <div className="bmxt-mode-status" role="status" aria-live="polite">
      <span className="bmxt-mode-status-seg bmxt-mode-status-seg--label bmxt-mode-status-seg--label-search">
        search
      </span>
      <span className="bmxt-mode-status-seg bmxt-mode-status-seg--state bmxt-mode-status-seg--on">
        {stateLabel}
      </span>
      <span className="bmxt-mode-status-seg bmxt-mode-status-seg--meta">{meta}</span>
      <span className="bmxt-mode-status-seg bmxt-mode-status-seg--hint">
        {locale === "ja"
          ? "末尾→で選択 · ← でプロンプト · Alt で page-active · → でピッカー · タブ←/→で詳細バー"
          : "EOL → focus · ← prompt · Alt page-active · → picker · tab ←/→ detail bar"}
        {" · "}
        {searchStatusHint(locale, pageActiveMode)}
      </span>
    </div>
  )
}
