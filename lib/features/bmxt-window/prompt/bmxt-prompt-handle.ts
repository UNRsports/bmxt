import type { TranslationBlock } from "../../translate"

export type BmxtPromptHandle = {
  getLine: () => string
  getCursor: () => number
  focus: () => void
  blur: () => void
  setLine: (line: string) => void
  setCursorPos: (pos: number) => void
  resolveTypingCommitText: () => Promise<string>
  getTranslateBlocks: () => readonly TranslationBlock[]
  closePromptPickerUi: () => void
  resetNavTranslateSession: () => void
  isDetailBarKeyboardBlocked: () => boolean
  isCaretAtPromptEnd: () => boolean
}
