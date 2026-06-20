import { promptMirrorSegments } from "../../nav/nav-prompt-input"

/** EN: Mirror layer span refs for direct DOM updates (avoid React re-render per keystroke). */
export type PromptMirrorDomRefs = {
  beforeEl: HTMLSpanElement | null
  compositionEl: HTMLSpanElement | null
  cursorCellEl: HTMLSpanElement | null
  afterEl: HTMLSpanElement | null
}

/** EN: Paint mirror segments without React — used on every input / composition tick. */
export function paintPromptMirrorDom(
  refs: PromptMirrorDomRefs,
  line: string,
  cursorPos: number,
  composing: boolean,
  compositionAnchor: number,
  promptPaneFocused: boolean
): void {
  const segments = promptMirrorSegments(line, cursorPos, composing, compositionAnchor)
  if (refs.beforeEl) {
    refs.beforeEl.textContent = segments.before
  }
  if (refs.afterEl) {
    refs.afterEl.textContent = segments.after
  }
  if (segments.composition) {
    if (refs.compositionEl) {
      refs.compositionEl.textContent = segments.composition
      refs.compositionEl.hidden = false
    }
    if (refs.cursorCellEl) {
      refs.cursorCellEl.hidden = true
    }
  } else {
    if (refs.compositionEl) {
      refs.compositionEl.textContent = ""
      refs.compositionEl.hidden = true
    }
    if (refs.cursorCellEl) {
      refs.cursorCellEl.hidden = false
      refs.cursorCellEl.textContent = segments.cur || "\u00a0"
      refs.cursorCellEl.className = `bmxt-cursor-cell${segments.cur ? "" : " bmxt-cursor-cell--eol"}${promptPaneFocused ? "" : " bmxt-cursor-cell--inactive"}`
    }
  }
}
