import type { ReactNode } from "react"
import type { PaneFocusTarget } from "./pane-focus-nav"

type Props = {
  focusTarget: Exclude<PaneFocusTarget, "terminal">
  paneFocus: PaneFocusTarget
  children: ReactNode
}

/** EN: Layer ② — split column chrome (focus ring; pane focus via keyboard only). */
export function PickerPanelHost({ focusTarget, paneFocus, children }: Props) {
  return (
    <div
      className={`bmxt-picker-host--split${paneFocus === focusTarget ? " bmxt-split-pane--focused" : ""}`}>
      {children}
    </div>
  )
}
