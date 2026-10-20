/** EN: Editable targets for nav Enter → typing mode (keep in sync with `nav-overlay-inject-fn.ts`). */

const TEXT_INPUT_TYPES = new Set([
  "text",
  "search",
  "email",
  "password",
  "url",
  "tel",
  "number"
])

export function isNavEditableElement(el: Element | null): el is HTMLElement {
  if (!el || !(el instanceof HTMLElement)) {
    return false
  }
  if (el instanceof HTMLTextAreaElement) {
    return !el.disabled && !el.readOnly
  }
  if (el instanceof HTMLInputElement) {
    if (el.disabled || el.readOnly) {
      return false
    }
    const t = (el.type || "text").toLowerCase()
    return TEXT_INPUT_TYPES.has(t)
  }
  if (el.isContentEditable) {
    return true
  }
  return false
}

export function resolveNavEditableTarget(from: Element | null): HTMLElement | null {
  if (!from) {
    return null
  }
  const self = from instanceof HTMLElement ? from : null
  if (self && isNavEditableElement(self)) {
    return self
  }
  const nested = from.closest(
    "textarea,input,[contenteditable=''],[contenteditable='true'],[contenteditable='plaintext-only']"
  )
  if (nested instanceof HTMLElement && isNavEditableElement(nested)) {
    return nested
  }
  if (self) {
    const labelled = self.closest("label")
    if (labelled) {
      const id = labelled.getAttribute("for")
      if (id) {
        const input = document.getElementById(id)
        if (input instanceof HTMLElement && isNavEditableElement(input)) {
          return input
        }
      }
    }
  }
  return null
}
