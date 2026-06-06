export {
  isPhysicalArrowDown,
  isPhysicalArrowUp,
  isReservedSplitPaneVerticalNav,
  verticalNavDirection
} from "../side-picker/interaction/picker-vertical-nav"

export function groupRowKey(windowId: number, groupId: number | null): string {
  return `${windowId}:${groupId === null ? "none" : String(groupId)}`
}

/** `markedGroupKeys`（`groupRowKey` 形式）から Chrome の tabGroup.id を抽出。 */
export function chromeTabGroupIdsFromMarkedGroupKeys(keys: string[]): number[] {
  const seen = new Set<number>()
  const out: number[] = []
  for (const k of keys) {
    const idx = k.lastIndexOf(":")
    if (idx < 0) {
      continue
    }
    const tail = k.slice(idx + 1)
    if (tail === "none") {
      continue
    }
    const n = Number(tail)
    if (!Number.isInteger(n)) {
      continue
    }
    if (seen.has(n)) {
      continue
    }
    seen.add(n)
    out.push(n)
  }
  return out
}
