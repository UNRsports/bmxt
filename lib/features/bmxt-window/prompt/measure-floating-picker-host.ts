/** EN: Position floating token/session picker host near the prompt cursor cell. */
export function measureFloatingPickerHostPosition(
  cell: HTMLElement | null,
  host: HTMLElement | null
): { left: number; top: number } | null {
  if (!cell) {
    return null
  }
  const cr = cell.getBoundingClientRect()
  const gap = 2
  const hostW = host?.offsetWidth ?? 260
  const hostH = host?.offsetHeight ?? 140
  let left = cr.right + gap
  const maxLeft = window.innerWidth - hostW - 8
  if (left > maxLeft) {
    left = Math.max(8, maxLeft)
  } else {
    left = Math.max(8, left)
  }
  let top = cr.bottom + gap
  if (top + hostH > window.innerHeight - 8 && cr.top - gap - hostH >= 8) {
    top = cr.top - gap - hostH
  }
  if (top + hostH > window.innerHeight - 8) {
    top = Math.max(8, window.innerHeight - hostH - 8)
  } else {
    top = Math.max(8, top)
  }
  return { left, top }
}
