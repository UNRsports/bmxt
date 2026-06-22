import { tabsStatusHint } from "../setting/i18n/resolvers"
import { tModeStatus } from "../setting/i18n/ns/mode-status"
import { useUiSettings } from "../setting/use-ui-settings"
import {
  settingTokenForPageActiveMode,
  type TabsPageActiveMode
} from "./page-active-setting"

type TabsStatusBarProps = {
  pageActiveMode: TabsPageActiveMode
}

export function TabsStatusBar({ pageActiveMode }: TabsStatusBarProps) {
  const { settings: uiSettings } = useUiSettings()
  const locale = uiSettings.locale
  const modeToken = settingTokenForPageActiveMode(pageActiveMode)
  const stateLabel = pageActiveMode === "auto" ? "auto" : "manual"

  return (
    <div className="bmxt-mode-status" role="status" aria-live="polite">
      <span className="bmxt-mode-status-seg bmxt-mode-status-seg--label bmxt-mode-status-seg--label-tabs">
        tabs
      </span>
      <span className="bmxt-mode-status-seg bmxt-mode-status-seg--state bmxt-mode-status-seg--on">
        {stateLabel}
      </span>
      <span className="bmxt-mode-status-seg bmxt-mode-status-seg--meta">page-active {modeToken}</span>
      <span className="bmxt-mode-status-seg bmxt-mode-status-seg--hint">
        {tModeStatus("modeStatus.tabs.hint", locale)}
        {" · "}
        {tabsStatusHint(locale, pageActiveMode)}
      </span>
    </div>
  )
}
