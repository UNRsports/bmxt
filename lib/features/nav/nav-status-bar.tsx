import { navActivateErrorLabel, navStatusHint } from "../setting/i18n/resolvers"
import { tNav } from "../setting/i18n/ns/nav"
import { useUiLocale } from "../setting/use-ui-settings"

type Props = {
  armed: boolean
  active: boolean
  typingMode?: boolean
  typingMultiline?: boolean
  menuOpen?: boolean
  textSelPhase?: "start" | "end" | "done" | "idle" | null
  jumpMode?: boolean
  jumpQuery?: string
  jumpMatchCount?: number
  targetLabel?: string | null
  activateError?: string | null
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
  jumpMode = false,
  jumpQuery = "",
  jumpMatchCount = 0,
  targetLabel = null,
  activateError = null,
  tabTitle,
  overlayError = null
}: Props) {
  const locale = useUiLocale()
  if (!armed) {
    return null
  }
  const activateLabel = navActivateErrorLabel(activateError, locale)
  const tabLabel =
    overlayError !== null && overlayError.length > 0
      ? `${tabTitle ?? "no tab"} — ${overlayError}`
      : activateLabel !== null
        ? `${tabTitle ?? "no tab"} — ${activateLabel}`
        : (tabTitle ?? "no tab")
  const textSelPicking = textSelPhase === "start" || textSelPhase === "end"
  const modeLabel = typingMode
    ? "typing"
    : jumpMode
      ? "jump"
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
    : jumpMode
      ? "jump"
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
  let metaExtra = ""
  if (jumpMode) {
    const q = jumpQuery.length > 0 ? jumpQuery : ""
    const matchPart =
      jumpQuery.length > 0 && jumpMatchCount === 0
        ? tNav("nav.jump.noMatch", locale)
        : jumpMatchCount > 0
          ? `${jumpMatchCount}`
          : ""
    metaExtra = q.length > 0 ? `/${q}${matchPart ? ` · ${matchPart}` : ""}` : "/"
  } else if (targetLabel && targetLabel.length > 0) {
    metaExtra = targetLabel
  }
  const metaLabel = metaExtra.length > 0 ? `${tabLabel} · ${metaExtra}` : tabLabel
  return (
    <div className="bmxt-mode-status" role="status" aria-live="polite">
      <span className="bmxt-mode-status-seg bmxt-mode-status-seg--label bmxt-mode-status-seg--label-nav">
        nav
      </span>
      <span
        className={`bmxt-mode-status-seg bmxt-mode-status-seg--state${active ? " bmxt-mode-status-seg--on" : ""}`}>
        {modeLabel}
      </span>
      <span className="bmxt-mode-status-seg bmxt-mode-status-seg--meta">{metaLabel}</span>
      <span className="bmxt-mode-status-seg bmxt-mode-status-seg--hint">
        {navStatusHint(locale, hintMode)}
      </span>
    </div>
  )
}
