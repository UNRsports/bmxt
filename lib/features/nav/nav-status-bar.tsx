import { navStatusHint } from "../setting/i18n/resolvers"
import { useUiLocale } from "../setting/use-ui-settings"

type Props = {
  armed: boolean
  active: boolean
  typingMode?: boolean
  typingMultiline?: boolean
  menuOpen?: boolean
  textSelPhase?: "start" | "end" | "done" | "idle" | null
  tabTitle: string | null
  overlayError?: string | null
}

export function NavStatusBar({
  armed,
  active,
  typingMode = false,
  typingMultiline = false,
  menuOpen = false,
  textSelPhase = null,
  tabTitle,
  overlayError = null
}: Props) {
  const locale = useUiLocale()
  if (!armed) {
    return null
  }
  const tabLabel =
    overlayError !== null && overlayError.length > 0
      ? `${tabTitle ?? "no tab"} — ${overlayError}`
      : (tabTitle ?? "no tab")
  const textSelPicking = textSelPhase === "start" || textSelPhase === "end"
  const modeLabel = typingMode
    ? "typing"
    : textSelPicking
      ? textSelPhase === "start"
        ? "sel-start"
        : "sel-end"
      : menuOpen
        ? textSelPhase === "done"
          ? "copy"
          : "menu"
        : active
          ? "ON"
          : "OFF (Alt toggles)"
  const hintMode = typingMode
    ? typingMultiline
      ? "typingMultiline"
      : "typing"
    : textSelPicking
      ? textSelPhase === "start"
        ? "selStart"
        : "selEnd"
      : textSelPhase === "done"
        ? menuOpen
          ? "copyOpen"
          : "copyClosed"
        : menuOpen
          ? "menu"
          : "idle"
  return (
    <div className="bmxt-mode-status" role="status" aria-live="polite">
      <span className="bmxt-mode-status-seg bmxt-mode-status-seg--label bmxt-mode-status-seg--label-nav">
        nav
      </span>
      <span
        className={`bmxt-mode-status-seg bmxt-mode-status-seg--state${active ? " bmxt-mode-status-seg--on" : ""}`}>
        {modeLabel}
      </span>
      <span className="bmxt-mode-status-seg bmxt-mode-status-seg--meta">{tabLabel}</span>
      <span className="bmxt-mode-status-seg bmxt-mode-status-seg--hint">
        {navStatusHint(locale, hintMode)}
      </span>
    </div>
  )
}
