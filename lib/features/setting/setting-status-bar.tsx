import { useUiLocale } from "./index"

/** EN: Detail bar for the setting list picker. */
export function SettingStatusBar() {
  const locale = useUiLocale()

  return (
    <div className="bmxt-mode-status" role="status" aria-live="polite">
      <span className="bmxt-mode-status-seg bmxt-mode-status-seg--label bmxt-mode-status-seg--label-setting">
        setting
      </span>
      <span className="bmxt-mode-status-seg bmxt-mode-status-seg--state bmxt-mode-status-seg--on">
        list
      </span>
      <span className="bmxt-mode-status-seg bmxt-mode-status-seg--meta">
        {locale === "ja" ? "UI 設定" : "UI settings"}
      </span>
      <span className="bmxt-mode-status-seg bmxt-mode-status-seg--hint">
        {locale === "ja"
          ? "Alt+↑↓ でバー選択 · → でピッカー · ← でプロンプト"
          : "Alt+↑↓ select bar · → enter picker · ← prompt"}
      </span>
    </div>
  )
}
