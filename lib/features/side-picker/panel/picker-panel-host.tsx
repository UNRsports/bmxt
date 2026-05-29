import type { ReactNode } from "react"
import type { PaneFocusTarget } from "./pane-focus-nav"

type Props = {
  focusTarget: Exclude<PaneFocusTarget, "terminal">
  paneFocus: PaneFocusTarget
  isFocusedPane: boolean
  children: ReactNode
}

/** EN: Layer ② — split column chrome (blue ring only when this leaf + column are active). */
export function PickerPanelHost({ focusTarget, paneFocus, isFocusedPane, children }: Props) {
  const columnActive = isFocusedPane && paneFocus === focusTarget
  return (
    <div
      className={`bmxt-picker-host--split${columnActive ? " bmxt-split-pane--focused" : ""}`}>
      {children}
    </div>
  )
}
