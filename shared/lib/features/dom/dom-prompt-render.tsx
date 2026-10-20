import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MutableRefObject
} from "react"
import { canScriptHttpHostPages } from "../extension-permissions/http-host-access"
import { tDomPrompt } from "../setting/i18n/ns/dom-prompt"
import { useUiSettings } from "../setting/use-ui-settings"

type Props = {
  /** Lines returned by the failing handler (shown verbatim above the buttons). */
  message: string[]
  /**
   * EN: Retry — after site access is available again, re-run the original command line.
   * JA: 再試行 — サイトアクセスが復帰したら元のコマンド行を再実行。
   */
  onRetry: () => void
  /** EN: Esc / N — return focus to BMXt prompt; picker column stays open. */
  onReturnToPrompt: () => void
  /** EN: ← — return focus to dom detail bar; picker column stays open. */
  onExitToDetailBar?: () => void
  keyboardActive?: boolean
  pickerInputRef?: MutableRefObject<HTMLTextAreaElement | null>
}

const ROW_ID_PREFIX = "bmxt-dom-prompt-row"

export function DomPromptRender({
  message,
  onRetry,
  onReturnToPrompt,
  onExitToDetailBar,
  keyboardActive = false,
  pickerInputRef
}: Props) {
  const { settings: uiSettings } = useUiSettings()
  const locale = uiSettings.locale
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const setInputEl = useCallback(
    (el: HTMLTextAreaElement | null) => {
      inputRef.current = el
      if (pickerInputRef) {
        pickerInputRef.current = el
      }
    },
    [pickerInputRef]
  )
  const [hi, setHi] = useState(0)
  const [busy, setBusy] = useState(false)
  const [extra, setExtra] = useState<string[]>([])

  useLayoutEffect(() => {
    if (keyboardActive) {
      inputRef.current?.focus()
    }
  }, [keyboardActive])

  useLayoutEffect(() => {
    document.getElementById(`${ROW_ID_PREFIX}-${hi}`)?.scrollIntoView({ block: "nearest" })
  }, [hi])

  const retry = useCallback(() => {
    if (busy) {
      return
    }
    setBusy(true)
    setExtra([])
    void (async () => {
      try {
        const ok = await canScriptHttpHostPages()
        if (ok) {
          onRetry()
          return
        }
        setExtra([tDomPrompt("domPrompt.stillDenied", locale)])
      } catch {
        setExtra([tDomPrompt("domPrompt.stillDenied", locale)])
      } finally {
        setBusy(false)
      }
    })()
  }, [busy, onRetry, locale])

  useEffect(() => {
    if (!keyboardActive) {
      return
    }
    const onWin = (ev: KeyboardEvent) => {
      if (ev.ctrlKey || ev.metaKey || ev.altKey || ev.shiftKey) {
        return
      }
      if (ev.key === "ArrowLeft" || ev.code === "ArrowLeft") {
        if (onExitToDetailBar) {
          ev.preventDefault()
          ev.stopImmediatePropagation()
          onExitToDetailBar()
        }
        return
      }
      if (ev.key === "Escape") {
        ev.preventDefault()
        ev.stopImmediatePropagation()
        onReturnToPrompt()
      }
    }
    window.addEventListener("keydown", onWin, true)
    return () => window.removeEventListener("keydown", onWin, true)
  }, [keyboardActive, onExitToDetailBar, onReturnToPrompt])

  const onInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (!keyboardActive) {
        return
      }
      if (e.nativeEvent.isComposing) {
        return
      }
      if (e.key === "ArrowLeft" || e.code === "ArrowLeft") {
        if (onExitToDetailBar) {
          e.preventDefault()
          onExitToDetailBar()
        }
        return
      }
      if (e.key === "Escape" || e.key === "n" || e.key === "N") {
        e.preventDefault()
        onReturnToPrompt()
        return
      }
      if (e.key === "Enter" || e.key === "y" || e.key === "Y") {
        e.preventDefault()
        retry()
        return
      }
      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault()
        setHi((h) => Math.min(h + 1, Math.max(0, message.length - 1)))
        return
      }
      if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault()
        setHi((h) => Math.max(h - 1, 0))
        return
      }
    },
    [keyboardActive, retry, message.length, onExitToDetailBar, onReturnToPrompt]
  )

  const allLines = [...message, ...(extra.length > 0 ? ["", ...extra] : [])]

  return (
    <div className="bmxt-tab-picker">
      <div className="bmxt-tab-picker-head">{tDomPrompt("domPrompt.headline", locale)}</div>
      <textarea
        ref={setInputEl}
        className="bmxt-tab-picker-filter-ime bmxt-picker-hidden-ime"
        rows={1}
        readOnly
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        autoComplete="off"
        wrap="off"
        aria-label={tDomPrompt("domPrompt.aria", locale)}
        value=""
        onKeyDown={onInputKeyDown}
      />
      <div
        className="bmxt-tab-picker-list bmxt-scroll bmxt-scroll--scrollable"
        role="listbox"
        aria-label={tDomPrompt("domPrompt.listAria", locale)}>
        {allLines.map((ln, i) => {
          const hiRow = i === hi
          return (
            <div
              key={i}
              id={`${ROW_ID_PREFIX}-${i}`}
              role="option"
              aria-selected={hiRow}
              className={`bmxt-tab-picker-row bmxt-tab-picker-row--tab${
                hiRow ? " bmxt-tab-picker-row--hi" : ""
              }`}>
              <div className="bmxt-tab-picker-tab-title">
                <span className="bmxt-tab-picker-tab-glyph"> </span>
                <span className="bmxt-tab-picker-tab-glyph"> </span>
                <span>{ln || "\u00a0"}</span>
              </div>
            </div>
          )
        })}
      </div>
      <div className="bmxt-dom-prompt-footer">
        <span
          className={`bmxt-dom-prompt-action-label bmxt-dom-prompt-action-label--primary${
            busy ? " bmxt-dom-prompt-action-label--busy" : ""
          }`}>
          {busy ? tDomPrompt("domPrompt.retryBusy", locale) : tDomPrompt("domPrompt.retry", locale)}
        </span>
        <span
          className={`bmxt-dom-prompt-action-label bmxt-dom-prompt-action-label--secondary${
            busy ? " bmxt-dom-prompt-action-label--busy" : ""
          }`}>
          {tDomPrompt("domPrompt.return", locale)}
        </span>
        <span className="bmxt-dom-prompt-footer-hint">{tDomPrompt("domPrompt.scrollHint", locale)}</span>
      </div>
    </div>
  )
}
