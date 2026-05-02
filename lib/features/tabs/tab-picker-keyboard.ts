/** `j`/`k` と矢印の共通方向（Ctrl+Shift や Shift+範囲は物理矢印のみ） */
export function verticalNavDirection(
  e: Pick<KeyboardEvent, "key" | "code">
): "up" | "down" | null {
  const k = e.key
  if (k === "ArrowDown" || k === "j" || k === "J") {
    return "down"
  }
  if (k === "ArrowUp" || k === "k" || k === "K") {
    return "up"
  }
  if (e.code === "ArrowDown") {
    return "down"
  }
  if (e.code === "ArrowUp") {
    return "up"
  }
  return null
}

export function isPhysicalArrowDown(e: Pick<KeyboardEvent, "key" | "code">): boolean {
  return e.key === "ArrowDown" || e.code === "ArrowDown"
}

export function isPhysicalArrowUp(e: Pick<KeyboardEvent, "key" | "code">): boolean {
  return e.key === "ArrowUp" || e.code === "ArrowUp"
}

export function groupRowKey(windowId: number, groupId: number | null): string {
  return `${windowId}:${groupId === null ? "none" : String(groupId)}`
}
