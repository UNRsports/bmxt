import { tModeStatus } from "./i18n/ns/mode-status"
import { useUiSettings } from "./use-ui-settings"

/** EN: Detail bar for the setting list picker. */
export function SettingStatusBar() {
  const { settings: uiSettings } = useUiSettings()
  const locale = uiSettings.locale

  return (
    <div className="bmxt-mode-status" role="status" aria-live="polite">
      <span className="bmxt-mode-status-seg bmxt-mode-status-seg--label bmxt-mode-status-seg--label-setting">
        setting
      </span>
      <span className="bmxt-mode-status-seg bmxt-mode-status-seg--state bmxt-mode-status-seg--on">
        list
      </span>
      <span className="bmxt-mode-status-seg bmxt-mode-status-seg--meta">
        {tModeStatus("modeStatus.setting.meta", locale)}
      </span>
      <span className="bmxt-mode-status-seg bmxt-mode-status-seg--hint">
        {tModeStatus("modeStatus.setting.hint", locale)}
      </span>
    </div>
  )
}
