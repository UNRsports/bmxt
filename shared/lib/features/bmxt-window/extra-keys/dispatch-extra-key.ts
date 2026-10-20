/**
 * EN: Dispatch a key-equivalent from the soft bar into the focused control.
 * JA: ソフトキーバーからフォーカス先へキー相当イベントを送る。
 */

export type ExtraKeyModifiers = {
  ctrl: boolean
  shift: boolean
  alt: boolean
}

export type DispatchExtraKeyOptions = {
  /** EN: Prompt IME textarea — focused when the prompt pane owns input. */
  ime: HTMLTextAreaElement | null
  promptPaneFocused: boolean
  /** EN: React prompt cursor (authoritative when the IME is controlled). */
  getCursorPos: () => number
  setCursorPos: (pos: number) => void
  getLineLength: () => number
  /** EN: Immutable prompt prefix length (confirm y/n), or 0. */
  lockedPrefixLength: number
}

function codeForKey(key: string): string {
  if (key === " ") {
    return "Space"
  }
  if (key === "Escape") {
    return "Escape"
  }
  if (key === "Tab") {
    return "Tab"
  }
  if (key === "Enter") {
    return "Enter"
  }
  if (key === "ArrowUp" || key === "ArrowDown" || key === "ArrowLeft" || key === "ArrowRight") {
    return key
  }
  if (key === "Backspace") {
    return "Backspace"
  }
  if (key === "Delete") {
    return "Delete"
  }
  if (key.length === 1) {
    const upper = key.toUpperCase()
    if (upper >= "A" && upper <= "Z") {
      return `Key${upper}`
    }
    if (upper >= "0" && upper <= "9") {
      return `Digit${upper}`
    }
  }
  return key
}

/**
 * EN: Fire a cancelable keydown on the best target; move caret when browser defaults are skipped.
 */
export function dispatchExtraKey(
  key: string,
  mods: ExtraKeyModifiers,
  options: DispatchExtraKeyOptions
): void {
  const ime = options.ime
  if (options.promptPaneFocused && ime !== null && document.activeElement !== ime) {
    ime.focus()
  }

  let target: HTMLElement | null = null
  const active = document.activeElement
  if (active instanceof HTMLElement && active !== document.body && active !== document.documentElement) {
    target = active
  } else if (ime !== null) {
    target = ime
  }
  if (target === null) {
    return
  }

  const event = new KeyboardEvent("keydown", {
    key,
    code: codeForKey(key),
    ctrlKey: mods.ctrl,
    shiftKey: mods.shift,
    altKey: mods.alt,
    metaKey: false,
    bubbles: true,
    cancelable: true
  })
  const accepted = target.dispatchEvent(event)

  if (!accepted) {
    return
  }

  if (target !== ime || ime === null) {
    return
  }
  if (mods.ctrl || mods.alt || mods.shift) {
    return
  }
  if (key !== "ArrowLeft" && key !== "ArrowRight" && key !== "Home" && key !== "End") {
    return
  }

  const lineLen = options.getLineLength()
  const minPos = Math.min(options.lockedPrefixLength, lineLen)
  let next = options.getCursorPos()
  if (key === "ArrowLeft") {
    next = Math.max(minPos, next - 1)
  } else if (key === "ArrowRight") {
    next = Math.min(lineLen, next + 1)
  } else if (key === "Home") {
    next = minPos
  } else if (key === "End") {
    next = lineLen
  }
  options.setCursorPos(next)
  ime.setSelectionRange(next, next)
}
