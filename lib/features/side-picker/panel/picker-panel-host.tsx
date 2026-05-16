import type { ReactNode } from "react"
import type { PaneFocusTarget } from "./pane-focus-nav"

type Props = {
  focusTarget: Exclude<PaneFocusTarget, "terminal">
  paneFocus: PaneFocusTarget
  onActivateFocus: () => void
  children: ReactNode
}

/** EN: Layer ② — split column chrome (focus ring + click-to-focus); command-agnostic. */
export function PickerPanelHost({ focusTarget, paneFocus, onActivateFocus, children }: Props) {
  return (
    <div
      className={`bmxt-picker-host--split${paneFocus === focusTarget ? " bmxt-split-pane--focused" : ""}`}
      onMouseDown={onActivateFocus}>
      {children}
    </div>
  )
}
