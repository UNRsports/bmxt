import { useUiCopy } from "./index"

/** EN: Detail bar for the setting list picker. */
export function SettingStatusBar() {
  const uiCopy = useUiCopy()

  return (
    <div className="bmxt-mode-status" role="status" aria-live="polite">
      <span className="bmxt-mode-status-seg bmxt-mode-status-seg--label bmxt-mode-status-seg--label-setting">
        setting
      </span>
      <span className="bmxt-mode-status-seg bmxt-mode-status-seg--state bmxt-mode-status-seg--on">
        list
      </span>
      <span className="bmxt-mode-status-seg bmxt-mode-status-seg--meta">
        {uiCopy.t("modeStatus.setting.meta")}
      </span>
      <span className="bmxt-mode-status-seg bmxt-mode-status-seg--hint">
        {uiCopy.t("modeStatus.setting.hint")}
      </span>
    </div>
  )
}
