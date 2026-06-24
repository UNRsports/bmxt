import { searchStatusHint } from "../setting/i18n/resolvers"
import { tModeStatus } from "../setting/i18n/ns/mode-status"
import { useUiSettings } from "../setting/use-ui-settings"
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
  const { settings: uiSettings } = useUiSettings()
  const modeToken = settingTokenForSearchPageActiveMode(pageActiveMode)
  const stateLabel = pageActiveMode === "auto" ? "auto" : "manual"
  const patternMeta =
    pattern && pattern.length > 0
      ? pattern.length > 48
        ? `${pattern.slice(0, 48)}…`
        : pattern
      : tModeStatus("modeStatus.search.noPattern", uiSettings.locale)
  const phasePrefix =
    phase === "loading" ? tModeStatus("modeStatus.search.loadingPrefix", uiSettings.locale) : ""
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
        {tModeStatus("modeStatus.search.hint", uiSettings.locale)}
        {" · "}
        {searchStatusHint(uiSettings.locale, pageActiveMode)}
      </span>
    </div>
  )
}
