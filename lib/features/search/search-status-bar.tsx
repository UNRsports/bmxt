import { searchStatusHint } from "../setting/i18n/resolvers"
import { useUiCopy } from "../setting/use-ui-copy"
import {
  settingTokenForSearchPageActiveMode,
  type SearchPageActiveMode
} from "./page-active-setting"

type SearchStatusBarProps = {
  pattern?: string
  phase?: "loading" | "results"
  pageActiveMode: SearchPageActiveMode
}

/** EN: Detail bar for the search list picker. */
export function SearchStatusBar({ pattern, phase, pageActiveMode }: SearchStatusBarProps) {
  const uiCopy = useUiCopy()
  const modeToken = settingTokenForSearchPageActiveMode(pageActiveMode)
  const stateLabel = pageActiveMode === "auto" ? "auto" : "manual"
  const patternMeta =
    pattern && pattern.length > 0
      ? pattern.length > 48
        ? `${pattern.slice(0, 48)}…`
        : pattern
      : uiCopy.t("modeStatus.search.noPattern")
  const phasePrefix = phase === "loading" ? uiCopy.t("modeStatus.search.loadingPrefix") : ""
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
        {uiCopy.t("modeStatus.search.hint")}
        {" · "}
        {searchStatusHint(uiCopy.locale, pageActiveMode)}
      </span>
    </div>
  )
}
