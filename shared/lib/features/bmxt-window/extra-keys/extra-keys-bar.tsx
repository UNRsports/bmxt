import { useCallback, useEffect, useState } from "react"
import { tShell } from "../../setting/i18n/ns/shell"
import type { UiLocale } from "../../setting/locale"
import { dispatchExtraKey } from "./dispatch-extra-key"

type StickyMods = {
  ctrl: boolean
  shift: boolean
  alt: boolean
}

export type ExtraKeysBarProps = {
  locale: UiLocale
  imeRef: React.RefObject<HTMLTextAreaElement | null>
  promptPaneFocused: boolean
  getCursorPos: () => number
  setCursorPos: (pos: number) => void
  getLineLength: () => number
  lockedPrefixLength: number
}

type ActionKey = {
  id: string
  label: string
  ariaKey:
    | "shell.extraKeys.key.esc"
    | "shell.extraKeys.key.tab"
    | "shell.extraKeys.key.enter"
    | "shell.extraKeys.key.up"
    | "shell.extraKeys.key.down"
    | "shell.extraKeys.key.left"
    | "shell.extraKeys.key.right"
    | "shell.extraKeys.key.ctrlC"
  key: string
  forceCtrl?: boolean
}

const ACTION_KEYS: readonly ActionKey[] = [
  { id: "esc", label: "Esc", ariaKey: "shell.extraKeys.key.esc", key: "Escape" },
  { id: "tab", label: "Tab", ariaKey: "shell.extraKeys.key.tab", key: "Tab" },
  { id: "up", label: "↑", ariaKey: "shell.extraKeys.key.up", key: "ArrowUp" },
  { id: "down", label: "↓", ariaKey: "shell.extraKeys.key.down", key: "ArrowDown" },
  { id: "left", label: "←", ariaKey: "shell.extraKeys.key.left", key: "ArrowLeft" },
  { id: "right", label: "→", ariaKey: "shell.extraKeys.key.right", key: "ArrowRight" },
  { id: "enter", label: "Enter", ariaKey: "shell.extraKeys.key.enter", key: "Enter" },
  { id: "ctrl-c", label: "^C", ariaKey: "shell.extraKeys.key.ctrlC", key: "c", forceCtrl: true }
]

function isModifierKeyName(key: string): boolean {
  return key === "Control" || key === "Shift" || key === "Alt" || key === "Meta"
}

/**
 * EN: Soft key row for hosts without physical Tab / Ctrl / arrows (e.g. Android).
 * JA: 物理の Tab／Ctrl／矢印が無いホスト向けソフトキー行。
 */
export function ExtraKeysBar(props: ExtraKeysBarProps) {
  const [sticky, setSticky] = useState<StickyMods>({
    ctrl: false,
    shift: false,
    alt: false
  })

  const clearSticky = useCallback(() => {
    setSticky({ ctrl: false, shift: false, alt: false })
  }, [])

  const toggleSticky = useCallback((mod: keyof StickyMods) => {
    setSticky((prev) => ({ ...prev, [mod]: !prev[mod] }))
  }, [])

  const fireKey = useCallback(
    (key: string, forceCtrl?: boolean) => {
      const mods = {
        ctrl: forceCtrl === true ? true : sticky.ctrl,
        shift: sticky.shift,
        alt: sticky.alt
      }
      dispatchExtraKey(key, mods, {
        ime: props.imeRef.current,
        promptPaneFocused: props.promptPaneFocused,
        getCursorPos: props.getCursorPos,
        setCursorPos: props.setCursorPos,
        getLineLength: props.getLineLength,
        lockedPrefixLength: props.lockedPrefixLength
      })
      clearSticky()
    },
    [clearSticky, props, sticky.alt, sticky.ctrl, sticky.shift]
  )

  // EN: While a sticky mod is lit, the next trusted keydown (soft keyboard) inherits it.
  //     Synthetic bar events are ignored (isTrusted === false) to avoid double-dispatch.
  useEffect(() => {
    if (!sticky.ctrl && !sticky.shift && !sticky.alt) {
      return
    }
    const onKeyDownCapture = (e: KeyboardEvent) => {
      if (!e.isTrusted) {
        return
      }
      if (isModifierKeyName(e.key)) {
        return
      }
      e.preventDefault()
      e.stopPropagation()
      dispatchExtraKey(
        e.key,
        {
          ctrl: sticky.ctrl || e.ctrlKey,
          shift: sticky.shift || e.shiftKey,
          alt: sticky.alt || e.altKey
        },
        {
          ime: props.imeRef.current,
          promptPaneFocused: props.promptPaneFocused,
          getCursorPos: props.getCursorPos,
          setCursorPos: props.setCursorPos,
          getLineLength: props.getLineLength,
          lockedPrefixLength: props.lockedPrefixLength
        }
      )
      clearSticky()
    }
    window.addEventListener("keydown", onKeyDownCapture, true)
    return () => window.removeEventListener("keydown", onKeyDownCapture, true)
  }, [clearSticky, props, sticky.alt, sticky.ctrl, sticky.shift])

  const onPointerDownButton = useCallback((e: React.PointerEvent) => {
    // EN: Keep IME / prompt focus — do not let the button steal it.
    e.preventDefault()
  }, [])

  return (
    <div
      className="bmxt-extra-keys"
      role="toolbar"
      aria-label={tShell("shell.extraKeys.toolbar", props.locale)}>
      <button
        type="button"
        className={`bmxt-extra-keys-btn bmxt-extra-keys-btn--mod${sticky.ctrl ? " bmxt-extra-keys-btn--lit" : ""}`}
        aria-pressed={sticky.ctrl}
        aria-label={tShell("shell.extraKeys.key.ctrl", props.locale)}
        onPointerDown={onPointerDownButton}
        onClick={() => toggleSticky("ctrl")}>
        Ctrl
      </button>
      <button
        type="button"
        className={`bmxt-extra-keys-btn bmxt-extra-keys-btn--mod${sticky.shift ? " bmxt-extra-keys-btn--lit" : ""}`}
        aria-pressed={sticky.shift}
        aria-label={tShell("shell.extraKeys.key.shift", props.locale)}
        onPointerDown={onPointerDownButton}
        onClick={() => toggleSticky("shift")}>
        Shift
      </button>
      <button
        type="button"
        className={`bmxt-extra-keys-btn bmxt-extra-keys-btn--mod${sticky.alt ? " bmxt-extra-keys-btn--lit" : ""}`}
        aria-pressed={sticky.alt}
        aria-label={tShell("shell.extraKeys.key.alt", props.locale)}
        onPointerDown={onPointerDownButton}
        onClick={() => {
          // EN: Second tap while lit fires bare Alt (nav toggle); first tap only sticks.
          if (sticky.alt) {
            fireKey("Alt")
            return
          }
          toggleSticky("alt")
        }}>
        Alt
      </button>
      {ACTION_KEYS.map((action) => (
        <button
          key={action.id}
          type="button"
          className="bmxt-extra-keys-btn"
          aria-label={tShell(action.ariaKey, props.locale)}
          onPointerDown={onPointerDownButton}
          onClick={() => fireKey(action.key, action.forceCtrl)}>
          {action.label}
        </button>
      ))}
    </div>
  )
}
