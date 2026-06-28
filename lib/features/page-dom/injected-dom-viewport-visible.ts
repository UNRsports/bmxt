/** EN: Viewport intersection test shared by dom -list --with capture paths. */
/** JA: dom -list --with のビューポート判定（共有）。 */

export function isElementVisibleInViewport(el: Element): boolean {
  const rect = el.getBoundingClientRect()
  if (rect.width === 0 && rect.height === 0) {
    return false
  }
  const vh = window.innerHeight
  const vw = window.innerWidth
  if (rect.bottom <= 0 || rect.top >= vh || rect.right <= 0 || rect.left >= vw) {
    return false
  }
  return true
}
