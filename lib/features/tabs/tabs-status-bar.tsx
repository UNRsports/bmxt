import {
  settingTokenForPageActiveMode,
  type TabsPageActiveMode
} from "./page-active-setting"

type Props = {
  pageActiveMode: TabsPageActiveMode
}

export function TabsStatusBar({ pageActiveMode }: Props) {
  const modeToken = settingTokenForPageActiveMode(pageActiveMode)
  const stateLabel = pageActiveMode === "auto" ? "auto" : "manual"
  const hint =
    pageActiveMode === "auto"
      ? "↑↓ でハイライト移動時にタブをアクティブ化（ウィンドウは背面） · Enter でジャンプ"
      : "Alt+↑↓ でタブをアクティブ化 · Enter でジャンプ · tabs -setting -page-active で切替"

  return (
    <div className="bmxt-mode-status" role="status" aria-live="polite">
      <span className="bmxt-mode-status-seg bmxt-mode-status-seg--label bmxt-mode-status-seg--label-tabs">
        tabs
      </span>
      <span className="bmxt-mode-status-seg bmxt-mode-status-seg--state bmxt-mode-status-seg--on">
        {stateLabel}
      </span>
      <span className="bmxt-mode-status-seg bmxt-mode-status-seg--meta">page-active {modeToken}</span>
      <span className="bmxt-mode-status-seg bmxt-mode-status-seg--hint">{hint}</span>
    </div>
  )
}
