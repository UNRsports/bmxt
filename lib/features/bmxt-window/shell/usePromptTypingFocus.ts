import { useEffect } from "react"

type UsePromptTypingFocusOptions = {
  enabled: boolean
  imeRef: React.RefObject<HTMLTextAreaElement | null>
  logScrollRef: React.RefObject<HTMLDivElement | null>
  /** EN: Synchronous IME focus (same keystroke / mouseup must land on the textarea). */
  focusPromptNow: () => void
  scrollPromptFootIntoView: () => void
  /** EN: Insert a single printable character into the IME when the first keystroke reclaimed focus. */
  insertPrintableWhenReclaiming: (ch: string) => void
  /** EN: Delete one code unit before the caret when Backspace reclaims focus. */
  deleteBackwardWhenReclaiming: () => void
}

function isEditableField(node: EventTarget | null): boolean {
  if (!(node instanceof HTMLElement)) {
    return false
  }
  const tag = node.tagName
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
    return true
  }
  return node.isContentEditable
}

function selectionIntersects(root: HTMLElement | null): boolean {
  if (!root) {
    return false
  }
  const sel = window.getSelection()
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
    return false
  }
  const anchor = sel.anchorNode
  if (!anchor) {
    return false
  }
  return root.contains(anchor)
}

function isModifierOnlyKey(e: Pick<KeyboardEvent, "key">): boolean {
  return e.key === "Control" || e.key === "Meta" || e.key === "Alt" || e.key === "Shift"
}

function isClipboardChord(e: Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey" | "altKey">): boolean {
  if (!e.ctrlKey && !e.metaKey) {
    return false
  }
  if (e.altKey) {
    return false
  }
  const key = e.key.toLowerCase()
  return key === "c" || key === "x" || key === "a" || key === "v"
}

/**
 * EN: Keep log selection for modifier chords (Ctrl/Cmd alone or with C/X/A/V).
 * Printable typing still reclaims the prompt.
 */
export function shouldPreserveLogSelectionOnKey(
  e: Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey" | "altKey">,
  hasLogSelection: boolean
): boolean {
  if (!hasLogSelection) {
    return false
  }
  if (isModifierOnlyKey(e)) {
    return true
  }
  if (e.ctrlKey || e.metaKey) {
    return true
  }
  return false
}

function isPrintableReclaimKey(e: KeyboardEvent): string | null {
  if (e.ctrlKey || e.metaKey || e.altKey) {
    return null
  }
  if (e.key.length !== 1) {
    return null
  }
  return e.key
}

/**
 * EN: When the terminal pane is logically focused but the IME lost DOM focus
 * (log scroll / text selection / focusable scrollport), reclaim focus on typing
 * or a non-selecting click like a conventional terminal. Preserve Ctrl/Cmd+C
 * selection copy in the log. Typing also re-pins the prompt foot into view.
 */
export function usePromptTypingFocus(options: UsePromptTypingFocusOptions): void {
  useEffect(() => {
    if (!options.enabled) {
      return
    }

    const imeOwnsFocus = (): boolean => {
      const ime = options.imeRef.current
      return ime !== null && document.activeElement === ime
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.isComposing || e.defaultPrevented) {
        return
      }
      const ime = options.imeRef.current
      if (!ime) {
        return
      }
      if (isEditableField(e.target) && e.target !== ime) {
        return
      }

      const logRoot = options.logScrollRef.current
      const hasLogSelection = selectionIntersects(logRoot)
      if (isClipboardChord(e) && hasLogSelection) {
        return
      }
      if (shouldPreserveLogSelectionOnKey(e, hasLogSelection)) {
        return
      }

      // EN: Already on the IME — still jump to the prompt foot when typing (scrollback).
      if (imeOwnsFocus()) {
        const printableWhileFocused = isPrintableReclaimKey(e)
        const backspaceWhileFocused =
          e.key === "Backspace" && !e.ctrlKey && !e.metaKey && !e.altKey
        if (printableWhileFocused !== null || backspaceWhileFocused || e.key === "Enter") {
          options.scrollPromptFootIntoView()
        }
        return
      }

      const printable = isPrintableReclaimKey(e)
      const isBackspace = e.key === "Backspace" && !e.ctrlKey && !e.metaKey && !e.altKey

      options.scrollPromptFootIntoView()
      options.focusPromptNow()

      if (printable !== null) {
        e.preventDefault()
        e.stopPropagation()
        options.insertPrintableWhenReclaiming(printable)
        return
      }
      if (isBackspace) {
        e.preventDefault()
        e.stopPropagation()
        options.deleteBackwardWhenReclaiming()
      }
    }

    const onMouseUp = (e: MouseEvent) => {
      if (e.button !== 0) {
        return
      }
      if (imeOwnsFocus()) {
        return
      }
      const logRoot = options.logScrollRef.current
      if (!logRoot) {
        return
      }
      const target = e.target
      if (!(target instanceof Node) || !logRoot.contains(target)) {
        return
      }
      if (target instanceof Element && target.closest("a, button, input, textarea, select")) {
        return
      }
      if (target instanceof Element && target.closest(".bmxt-prompt-line, .bmxt-mode-status-row")) {
        options.focusPromptNow()
        return
      }
      if (selectionIntersects(logRoot)) {
        return
      }
      options.scrollPromptFootIntoView()
      options.focusPromptNow()
    }

    window.addEventListener("keydown", onKeyDown, true)
    window.addEventListener("mouseup", onMouseUp, true)
    return () => {
      window.removeEventListener("keydown", onKeyDown, true)
      window.removeEventListener("mouseup", onMouseUp, true)
    }
  }, [
    options.enabled,
    options.imeRef,
    options.logScrollRef,
    options.focusPromptNow,
    options.scrollPromptFootIntoView,
    options.insertPrintableWhenReclaiming,
    options.deleteBackwardWhenReclaiming
  ])
}
