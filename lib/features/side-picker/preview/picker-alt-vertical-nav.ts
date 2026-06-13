import type { MutableRefObject } from "react"
import { isPickerAltOnlyChord } from "./picker-alt-chord"
import {
  isReservedSplitPaneVerticalNav,
  verticalNavDirection
} from "../interaction/picker-vertical-nav"

/**
 * EN: When Alt+↑↓, mark alt held for preview sync. Returns vertical nav direction or null.
 * JA: Alt+↑↓ 時に alt 保持を記録し、縦移動方向を返す（該当なしは null）。
 */
export function pickerAltVerticalNavDirection(
  e: Pick<KeyboardEvent, "altKey" | "ctrlKey" | "metaKey" | "shiftKey" | "key" | "code">,
  altKeyHeldRef: MutableRefObject<boolean>
): "up" | "down" | null {
  if (e.altKey && !isPickerAltOnlyChord(e)) {
    return null
  }
  if (isReservedSplitPaneVerticalNav(e)) {
    return null
  }
  const navDir = verticalNavDirection(e)
  if (isPickerAltOnlyChord(e) && navDir !== null) {
    altKeyHeldRef.current = true
  }
  return navDir
}
