import { tabsStatusHint, useUiLocale } from "../setting"
import {
  settingTokenForPageActiveMode,
  type TabsPageActiveMode
} from "./page-active-setting"

type Props = {
  pageActiveMode: TabsPageActiveMode
}

export function TabsStatusBar({ pageActiveMode }: Props) {
  const locale = useUiLocale()
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
        {locale === "ja"
          ? "↓ で選択 · → でピッカー · タブ←/→で詳細バー · 窓/グループ←→で開閉"
          : "↓ select · → picker · tab ←/→ detail bar · win/group ←→ fold"}
        {" · "}
        {tabsStatusHint(locale, pageActiveMode)}
      </span>
    </div>
  )
}
