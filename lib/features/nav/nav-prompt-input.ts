/** EN: BMXt prompt textarea — nav typing mode captures input here and forwards to the page. */

export const NAV_PROMPT_TEXTAREA_CLASS = "bmxt-prompt-ime"

export function isNavPromptTextarea(target: EventTarget | null): target is HTMLTextAreaElement {
  return (
    target instanceof HTMLTextAreaElement &&
    target.classList.contains(NAV_PROMPT_TEXTAREA_CLASS)
  )
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
