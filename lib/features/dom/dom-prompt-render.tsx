import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MutableRefObject
} from "react"
import { OPTIONAL_HTTP_HOST_ORIGINS } from "../extension-permissions/optional-http-hosts"

type Props = {
  /** Lines returned by the failing handler (shown verbatim above the buttons). */
  message: string[]
  /** Approve: request host permission (if missing), then re-run the original command line. */
  onApprove: () => void
  /** EN: Esc / N — return focus to BMXt prompt; picker column stays open. */
  onReturnToPrompt: () => void
  /** Notify parent that a permission grant succeeded (so it can re-dispatch). */
  onPermissionGranted?: () => void
  keyboardActive?: boolean
  pickerInputRef?: MutableRefObject<HTMLTextAreaElement | null>
}

const HEADLINE =
  "dom -list — permission / target check · Enter=許可 / Y · Esc/N → prompt"
const ROW_ID_PREFIX = "bmxt-dom-prompt-row"

/**
 * EN: Confirmation panel shown when `dom -list` returned a retryable error.
 *     "Approve" calls `chrome.permissions.request` (if optional host access is missing) within
 *     the user gesture from the key event, then triggers `onApprove` to re-dispatch.
 *     Esc/N returns to the BMXt prompt (picker stays open). Uses the same `bmxt-tab-picker` chrome as find-list /
 *     dom-list rows so the styling stays consistent.
 * JA: `dom -list` がリトライ可能なエラーを返したときに表示する確認パネル。
 *     「許可」はキーのユーザージェスチャ内で `chrome.permissions.request` を呼び、
 *     許可が取れたら `onApprove` で再ディスパッチする。
 *     「拒否」はピッカーを閉じる。チューブ表示は find-list / dom-list と同じクロムで統一。
 */
export function DomPromptRender({
  message,
  onApprove,
  onReturnToPrompt,
  onPermissionGranted,
  keyboardActive = false,
  pickerInputRef
}: Props) {
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

  const approve = useCallback(() => {
    if (busy) {
      return
    }
    setBusy(true)
    void (async () => {
      try {
        const origins = [...OPTIONAL_HTTP_HOST_ORIGINS] as string[]
        const already = await chrome.permissions.contains({ origins })
        let granted = already
        if (!already) {
          granted = await chrome.permissions.request({ origins })
        }
        if (granted) {
          if (onPermissionGranted) {
            onPermissionGranted()
          }
          onApprove()
          return
        }
        setExtra([
          "EN: Permission was not granted by the browser; keeping the picker open so you can retry.",
          "JA: ブラウザで許可されませんでした。ピッカーを開いたままにします — 再度 Enter で許可、または Esc でプロンプトへ。"
        ])
      } catch (err) {
        setExtra([
          `error: permission request failed — ${err instanceof Error ? err.message : String(err)}`
        ])
      } finally {
        setBusy(false)
      }
    })()
  }, [busy, onApprove, onPermissionGranted])

  useEffect(() => {
    if (!keyboardActive) {
      return
    }
    const onWin = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") {
        ev.preventDefault()
        onReturnToPrompt()
      }
    }
    window.addEventListener("keydown", onWin, true)
    return () => window.removeEventListener("keydown", onWin, true)
  }, [keyboardActive, onReturnToPrompt])

  const onInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (!keyboardActive) {
        return
      }
      if (e.nativeEvent.isComposing) {
        return
      }
      if (e.key === "Escape" || e.key === "n" || e.key === "N") {
        e.preventDefault()
        onReturnToPrompt()
        return
      }
      if (e.key === "Enter" || e.key === "y" || e.key === "Y") {
        e.preventDefault()
        approve()
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
    [keyboardActive, approve, message.length, onReturnToPrompt]
  )

  const allLines = [...message, ...(extra.length > 0 ? ["", ...extra] : [])]

  return (
    <div className="bmxt-tab-picker">
      <div className="bmxt-tab-picker-head">{HEADLINE}</div>
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
        aria-label="Permission prompt / 許可ダイアログ"
        value=""
        onKeyDown={onInputKeyDown}
      />
      <div
        className="bmxt-tab-picker-list bmxt-scroll bmxt-scroll--scrollable"
        role="listbox"
        aria-label="Permission notice">
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
          {busy ? "Requesting…" : "許可 (Enter / Y)"}
        </span>
        <span
          className={`bmxt-dom-prompt-action-label bmxt-dom-prompt-action-label--secondary${
            busy ? " bmxt-dom-prompt-action-label--busy" : ""
          }`}>
          プロンプトへ (Esc / N)
        </span>
        <span className="bmxt-dom-prompt-footer-hint">↑↓ / j k でメッセージをスクロール</span>
      </div>
    </div>
  )
}
