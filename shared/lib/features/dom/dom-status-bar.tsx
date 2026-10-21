import { domStatusHint } from "../setting/i18n/resolvers"
import { tModeStatus } from "../setting/i18n/ns/mode-status"
import { useUiSettings } from "../setting/use-ui-settings"
import {
  settingTokenForDomPageActiveMode,
  type DomPageActiveMode
} from "./page-active-setting"

type DomStatusBarProps = {
  kind: "lines" | "prompt"
  pageActiveMode: DomPageActiveMode
}

/** EN: Detail bar for the dom list picker. */
export function DomStatusBar({ kind, pageActiveMode }: DomStatusBarProps) {
  const { settings: uiSettings } = useUiSettings()
  const locale = uiSettings.locale
  const modeToken = settingTokenForDomPageActiveMode(pageActiveMode)
  const stateLabel = pageActiveMode === "auto" ? "auto" : "manual"
  const kindMeta =
    kind === "prompt"
      ? tModeStatus("modeStatus.dom.permission", locale)
      : tModeStatus("modeStatus.dom.list", locale)
  const meta = `${kindMeta} · page-active ${modeToken}`

  return (
    <div className="bmxt-mode-status" role="status" aria-live="polite">
      <span className="bmxt-mode-status-seg bmxt-mode-status-seg--label bmxt-mode-status-seg--label-dom">
        dom
      </span>
      <span className="bmxt-mode-status-seg bmxt-mode-status-seg--state bmxt-mode-status-seg--on">
        {stateLabel}
      </span>
      <span className="bmxt-mode-status-seg bmxt-mode-status-seg--meta">{meta}</span>
      <span className="bmxt-mode-status-seg bmxt-mode-status-seg--hint">
        {tModeStatus("modeStatus.dom.hint", locale)}
        {" · "}
        {domStatusHint(locale, pageActiveMode)}
      </span>
    </div>
  )
}
