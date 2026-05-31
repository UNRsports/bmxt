/** EN: BMXt prompt textarea — nav typing mode captures input here and forwards to the page. */

export const NAV_PROMPT_TEXTAREA_CLASS = "bmxt-prompt-ime"

export function isNavPromptTextarea(target: EventTarget | null): target is HTMLTextAreaElement {
  return (
    target instanceof HTMLTextAreaElement &&
    target.classList.contains(NAV_PROMPT_TEXTAREA_CLASS)
  )
}

/** EN: Nav typing allows a line break only with Shift+Enter on a multiline page field. */
export function navTypingLineBreakAllowed(shiftKey: boolean, multiline: boolean): boolean {
  return shiftKey && multiline
}

/** EN: Block `insertLineBreak` / `insertParagraph` unless Shift+Enter on multiline. */
export function navTypingShouldPreventLineBreakInput(
  inputType: string,
  shiftKey: boolean,
  multiline: boolean
): boolean {
  if (inputType !== "insertLineBreak" && inputType !== "insertParagraph") {
    return false
  }
  return !navTypingLineBreakAllowed(shiftKey, multiline)
}

/** EN: Remove line breaks that IME confirm / plain Enter must not leave in the buffer. */
export function sanitizeNavTypingInsertText(
  text: string,
  shiftKey: boolean,
  multiline: boolean
): string {
  if (navTypingLineBreakAllowed(shiftKey, multiline)) {
    return text
  }
  return text.replace(/\r\n?|\n/g, "")
}

/** EN: Strip all line breaks from single-line nav typing buffers. */
export function sanitizeNavTypingBuffer(value: string, multiline: boolean): string {
  if (multiline) {
    return value
  }
  return value.replace(/\r\n?|\n/g, "")
}

/**
 * EN: Keep only the first N `\n` already present in `snapshot` (Shift+Enter); drop IME / Enter artifacts.
 * JA: 原文にない改行（IME 確定 Enter など）を除去し、意図した改行だけ残す。
 */
export function stripNewlinesBeyondSnapshot(current: string, snapshot: string): string {
  const allowed = (snapshot.match(/\n/g) ?? []).length
  if (allowed === 0) {
    return current.replace(/\r\n?|\n/g, "")
  }
  let seen = 0
  let out = ""
  for (let i = 0; i < current.length; i++) {
    const ch = current[i]!
    if (ch === "\r" && current[i + 1] === "\n") {
      seen++
      if (seen <= allowed) {
        out += "\n"
      }
      i++
      continue
    }
    if (ch === "\n") {
      seen++
      if (seen <= allowed) {
        out += "\n"
      }
      continue
    }
    out += ch
  }
  return out
}

/** EN: Sanitize DOM textarea value for nav typing; preserve only snapshot newlines when multiline. */
export function sanitizeNavTypingDomValue(
  value: string,
  multiline: boolean,
  newlineSnapshot: string
): string {
  if (!multiline) {
    return sanitizeNavTypingBuffer(value, false)
  }
  return stripNewlinesBeyondSnapshot(value, newlineSnapshot)
}

/** EN: Sanitize DOM value and adjust cursor when spurious newlines are removed. */
export function sanitizeNavTypingDomValueWithCursor(
  value: string,
  cursor: number,
  multiline: boolean,
  newlineSnapshot: string
): { value: string; cursor: number } {
  const sanitized = sanitizeNavTypingDomValue(value, multiline, newlineSnapshot)
  if (sanitized === value) {
    return { value: sanitized, cursor }
  }
  if (!multiline) {
    const removedBefore = (value.slice(0, cursor).match(/\r\n?|\n/g) ?? []).length
    return { value: sanitized, cursor: Math.max(0, cursor - removedBefore) }
  }
  const allowed = (newlineSnapshot.match(/\n/g) ?? []).length
  let seen = 0
  let removedBefore = 0
  for (let i = 0; i < cursor && i < value.length; i++) {
    const ch = value[i]!
    if (ch === "\r" && value[i + 1] === "\n") {
      seen++
      if (seen > allowed) {
        removedBefore++
      }
      i++
      continue
    }
    if (ch === "\n") {
      seen++
      if (seen > allowed) {
        removedBefore++
      }
    }
  }
  return { value: sanitized, cursor: Math.max(0, cursor - removedBefore) }
}

/** EN: Insert chunk into nav typing buffer at selection. */
export function navTypingInsert(
  line: string,
  start: number,
  end: number,
  chunk: string
): { next: string; cursor: number } {
  const next = line.slice(0, start) + chunk + line.slice(end)
  return { next, cursor: start + chunk.length }
}

/** EN: Delete backward in nav typing buffer. */
export function navTypingDeleteBackward(
  line: string,
  selectionStart: number,
  selectionEnd: number
): { next: string; cursor: number } | null {
  if (selectionStart !== selectionEnd) {
    return { next: line.slice(0, selectionStart) + line.slice(selectionEnd), cursor: selectionStart }
  }
  if (selectionStart === 0) {
    return null
  }
  return {
    next: line.slice(0, selectionStart - 1) + line.slice(selectionStart),
    cursor: selectionStart - 1
  }
}

/** EN: Delete forward in nav typing buffer. */
export function navTypingDeleteForward(
  line: string,
  selectionStart: number,
  selectionEnd: number
): { next: string; cursor: number } | null {
  if (selectionStart !== selectionEnd) {
    return { next: line.slice(0, selectionStart) + line.slice(selectionEnd), cursor: selectionStart }
  }
  if (selectionEnd >= line.length) {
    return null
  }
  return {
    next: line.slice(0, selectionEnd) + line.slice(selectionEnd + 1),
    cursor: selectionStart
  }
}

/**
 * EN: Mirror segments for the transparent textarea + mirror prompt.
 * JA: 変換中は anchor〜caret を未確定文字として下線表示する。
 */
export function promptMirrorSegments(
  line: string,
  cursorPos: number,
  composing: boolean,
  compositionAnchor: number
): { before: string; composition: string; cur: string; after: string } {
  if (composing) {
    const anchor = Math.max(0, Math.min(compositionAnchor, line.length))
    const caret = Math.max(anchor, Math.min(cursorPos, line.length))
    return {
      before: line.slice(0, anchor),
      composition: line.slice(anchor, caret),
      cur: "",
      after: line.slice(caret)
    }
  }
  return {
    before: line.slice(0, cursorPos),
    composition: "",
    cur: line[cursorPos] ?? "",
    after: line.slice(cursorPos + 1)
  }
}

/** EN: `beforeinput` types we forward to the page field (not partial IME composition). */
export function navBeforeInputAction(
  inputType: string,
  data: string | null
): "insert" | "backward" | "forward" | null {
  if (inputType === "deleteContentBackward") {
    return "backward"
  }
  if (inputType === "deleteContentForward") {
    return "forward"
  }
  if (
    data &&
    (inputType === "insertText" ||
      inputType === "insertFromComposition" ||
      inputType === "insertReplacementText")
  ) {
    return "insert"
  }
  return null
}
