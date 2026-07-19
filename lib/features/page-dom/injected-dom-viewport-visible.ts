/** EN: Viewport intersection test shared by dom -list --with capture paths. */
/** JA: dom -list --with のビューポート判定（共有）。 */

/** EN: Non-zero layout box (may be off-screen). Used for whole-page nav jump search. */
export function isElementLaidOut(el: Element): boolean {
  const rect = el.getBoundingClientRect()
  return !(rect.width === 0 && rect.height === 0)
}

export function isElementVisibleInViewport(el: Element): boolean {
  if (!isElementLaidOut(el)) {
    return false
  }
  const rect = el.getBoundingClientRect()
  const vh = window.innerHeight
  const vw = window.innerWidth
  if (rect.bottom <= 0 || rect.top >= vh || rect.right <= 0 || rect.left >= vw) {
    return false
  }
  return true
}
