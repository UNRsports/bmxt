import {
  useEffect,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject
} from "react"
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
  /** EN: Committed filter after Enter (browse-like); shown when not composing. */
  jumpFilter?: string
  jumpMatchCount?: number
  targetLabel?: string | null
  activateError?: string | null
  tabTitle: string | null
  overlayError?: string | null
  /** EN: Detail-bar IME field — updates jump query (composition-safe). */
  onJumpQueryChange?: (value: string) => void
  onJumpInputKeyDown?: (e: ReactKeyboardEvent<HTMLInputElement>) => void
  jumpInputRef?: RefObject<HTMLInputElement | null>
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
  jumpFilter = "",
  jumpMatchCount = 0,
  targetLabel = null,
  activateError = null,
  tabTitle,
  overlayError = null,
  onJumpQueryChange,
  onJumpInputKeyDown,
  jumpInputRef
}: Props) {
  const locale = useUiLocale()
  const localJumpInputRef = useRef<HTMLInputElement | null>(null)
  const inputRef = jumpInputRef ?? localJumpInputRef

  useEffect(() => {
    if (!jumpMode) {
      return
    }
    const el = inputRef.current
    if (!el) {
      return
    }
    el.focus()
    const len = el.value.length
    try {
      el.setSelectionRange(len, len)
    } catch {
      /* ignore */
    }
  }, [jumpMode, inputRef])

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
  const filterActive = !jumpMode && jumpFilter.length > 0
  const modeLabel = typingMode
    ? "typing"
    : jumpMode
      ? "jump"
      : filterActive
        ? "find"
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
      : filterActive
        ? "jumpFilter"
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
  const activeQuery = jumpMode ? jumpQuery : jumpFilter
  const matchPart =
    (jumpMode || filterActive) && activeQuery.length > 0 && jumpMatchCount === 0
      ? tNav("nav.jump.noMatch", locale)
      : (jumpMode || filterActive) && jumpMatchCount > 0
        ? String(jumpMatchCount)
        : ""
  let metaExtra = ""
  if (!jumpMode && !filterActive && targetLabel && targetLabel.length > 0) {
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
      {jumpMode ? (
        <span className="bmxt-mode-status-seg bmxt-mode-status-seg--jump">
          <span className="bmxt-mode-status-jump-prefix" aria-hidden="true">
            /
          </span>
          <input
            ref={inputRef}
            type="text"
            className="bmxt-mode-status-jump-input"
            value={jumpQuery}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
            maxLength={200}
            aria-label={tNav("nav.jump.inputAria", locale)}
            placeholder={tNav("nav.jump.inputPlaceholder", locale)}
            onChange={(e) => {
              onJumpQueryChange?.(e.target.value)
            }}
            onCompositionEnd={(e) => {
              onJumpQueryChange?.(e.currentTarget.value)
            }}
            onKeyDown={(e) => {
              onJumpInputKeyDown?.(e)
            }}
          />
          {matchPart.length > 0 ? (
            <span className="bmxt-mode-status-jump-match">{matchPart}</span>
          ) : null}
        </span>
      ) : filterActive ? (
        <span className="bmxt-mode-status-seg bmxt-mode-status-seg--jump">
          <span className="bmxt-mode-status-jump-prefix" aria-hidden="true">
            /
          </span>
          <span className="bmxt-mode-status-jump-committed">{jumpFilter}</span>
          {matchPart.length > 0 ? (
            <span className="bmxt-mode-status-jump-match">{matchPart}</span>
          ) : null}
        </span>
      ) : null}
      <span className="bmxt-mode-status-seg bmxt-mode-status-seg--hint">
        {navStatusHint(locale, hintMode)}
      </span>
    </div>
  )
}
