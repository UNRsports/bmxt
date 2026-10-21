import type { PaneFocusTarget } from "../../side-picker/panel/pane-focus-nav"

/**
 * EN: Prompt IME may receive focus only while the terminal column owns pane focus.
 * After `| browse` / `activatePaneFocus(picker)`, compound completion still calls
 * `focusPrompt` — callers must skip so the picker hidden IME keeps `/` search.
 */
export function shouldFocusPromptIme(paneFocus: PaneFocusTarget): boolean {
  return paneFocus === "terminal"
}
