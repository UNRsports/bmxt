/**
 * EN: Immutable prompt prefix (Linux-style confirm): caret and edits stay after `lockedPrefix`.
 * JA: 確認プロンプトの固定接頭辞 — カーソルと編集は接頭辞より後ろのみ。
 */

export type PromptLockedClamp = {
  line: string
  cursor: number
}

/**
 * EN: Ensure `line` still begins with `lockedPrefix` and caret stays at or after it.
 * JA: `line` が接頭辞で始まり、キャレットが接頭辞以降になるよう矯正する。
 */
export function clampPromptLockedPrefix(
  line: string,
  cursor: number,
  lockedPrefix: string
): PromptLockedClamp {
  if (lockedPrefix.length === 0) {
    return { line, cursor }
  }

  let nextLine = line
  let rebuilt = false
  if (!nextLine.startsWith(lockedPrefix)) {
    rebuilt = true
    if (lockedPrefix.startsWith(nextLine)) {
      // EN: Deletion ate into the locked region — restore prefix, empty answer.
      nextLine = lockedPrefix
    } else if (nextLine.length <= 3 && !/\s/.test(nextLine)) {
      // EN: Short paste / select-all replace (y/n/yes/no) — treat buffer as the answer only.
      nextLine = lockedPrefix + nextLine
    } else {
      // EN: Stale command line still in the buffer (e.g. `close`) — drop it.
      nextLine = lockedPrefix
    }
  }

  const min = lockedPrefix.length
  const preferred = rebuilt ? nextLine.length : cursor
  const nextCursor = Math.max(min, Math.min(preferred, nextLine.length))
  return { line: nextLine, cursor: nextCursor }
}

/**
 * EN: True when a delete of the current selection/caret would touch the locked prefix.
 */
export function lockedPrefixBlocksDelete(
  lockedPrefix: string,
  selectionStart: number,
  selectionEnd: number,
  inputType: "deleteContentBackward" | "deleteContentForward" | "deleteByCut"
): boolean {
  if (lockedPrefix.length === 0) {
    return false
  }
  const min = lockedPrefix.length
  if (selectionStart !== selectionEnd) {
    return selectionStart < min
  }
  if (inputType === "deleteContentBackward") {
    return selectionStart <= min
  }
  // Forward delete / cut at caret inside prefix.
  return selectionStart < min
}

/** EN: Editable suffix after the locked confirm prefix. */
export function answerAfterLockedPrefix(line: string, lockedPrefix: string): string {
  if (lockedPrefix.length === 0) {
    return line
  }
  if (line.startsWith(lockedPrefix)) {
    return line.slice(lockedPrefix.length)
  }
  return line
}
