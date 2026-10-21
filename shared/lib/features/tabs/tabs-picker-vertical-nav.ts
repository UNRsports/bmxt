import type { MutableRefObject } from "react"
import { isPickerAltOnlyChord } from "../side-picker/preview/picker-alt-chord"
import {
  isReservedSplitPaneVerticalNav,
  physicalArrowVerticalNavDirection
} from "../side-picker/interaction/picker-vertical-nav"

/** EN: Tab picker vertical nav — physical arrows only (no j/k). */
export function tabsPickerAltVerticalNavDirection(
  e: Pick<KeyboardEvent, "altKey" | "ctrlKey" | "metaKey" | "shiftKey" | "key" | "code">,
  altKeyHeldRef: MutableRefObject<boolean>
): "up" | "down" | null {
  if (e.altKey && !isPickerAltOnlyChord(e)) {
    return null
  }
  if (isReservedSplitPaneVerticalNav(e)) {
    return null
  }
  const navDir = physicalArrowVerticalNavDirection(e)
  if (isPickerAltOnlyChord(e) && navDir !== null) {
    altKeyHeldRef.current = true
  }
  return navDir
}
