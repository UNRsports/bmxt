import { useUiCopy } from "../setting"

/** EN: Shell chrome + loading row until the real prompt is interactive. */
export function TerminalBootSplash() {
  const uiCopy = useUiCopy()

  return (
    <div
      className="bmxt-root bmxt-root--terminal bmxt-root--boot"
      aria-busy="true"
      aria-live="polite">
      <div className="bmxt-session-bar bmxt-session-bar--boot" aria-hidden="true">
        <span className="bmxt-session-bar-tab bmxt-session-bar-tab--boot">
          <span className="bmxt-session-bar-tab-index">1</span>
          <span className="bmxt-session-bar-tab-label">BMXt</span>
        </span>
      </div>
      <div className="bmxt-boot-main">
        <span className="bmxt-boot-loading">
          <span className="bmxt-boot-loading-spinner" aria-hidden="true" />
          {uiCopy.t("shell.bootLoading")}
        </span>
      </div>
    </div>
  )
}
