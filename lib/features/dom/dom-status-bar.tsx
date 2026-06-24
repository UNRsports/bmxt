import { tModeStatus } from "../setting/i18n/ns/mode-status"
import { useUiSettings } from "../setting/use-ui-settings"

type DomStatusBarProps = {
  kind: "lines" | "prompt"
}

/** EN: Detail bar for the dom list picker. */
export function DomStatusBar({ kind }: DomStatusBarProps) {
  const { settings: uiSettings } = useUiSettings()
  const locale = uiSettings.locale
  const stateLabel = kind === "prompt" ? "prompt" : "list"

  return (
    <div className="bmxt-mode-status" role="status" aria-live="polite">
      <span className="bmxt-mode-status-seg bmxt-mode-status-seg--label bmxt-mode-status-seg--label-dom">
        dom
      </span>
      <span className="bmxt-mode-status-seg bmxt-mode-status-seg--state bmxt-mode-status-seg--on">
        {stateLabel}
      </span>
      <span className="bmxt-mode-status-seg bmxt-mode-status-seg--meta">
        {kind === "prompt"
          ? tModeStatus("modeStatus.dom.permission", locale)
          : tModeStatus("modeStatus.dom.list", locale)}
      </span>
      <span className="bmxt-mode-status-seg bmxt-mode-status-seg--hint">
        {tModeStatus("modeStatus.dom.hint", locale)}
      </span>
    </div>
  )
}
