import { tModeStatus } from "../setting/i18n/ns/mode-status"
import { useUiSettings } from "../setting/use-ui-settings"

/** EN: Detail bar for the history tree picker. */
export function HistoryStatusBar() {
  const { settings: uiSettings } = useUiSettings()
  const locale = uiSettings.locale

  return (
    <div className="bmxt-mode-status" role="status" aria-live="polite">
      <span className="bmxt-mode-status-seg bmxt-mode-status-seg--label bmxt-mode-status-seg--label-history">
        history
      </span>
      <span className="bmxt-mode-status-seg bmxt-mode-status-seg--state bmxt-mode-status-seg--on">
        list
      </span>
      <span className="bmxt-mode-status-seg bmxt-mode-status-seg--meta">
        {tModeStatus("modeStatus.history.meta", locale)}
      </span>
      <span className="bmxt-mode-status-seg bmxt-mode-status-seg--hint">
        {tModeStatus("modeStatus.history.hint", locale)}
      </span>
    </div>
  )
}
