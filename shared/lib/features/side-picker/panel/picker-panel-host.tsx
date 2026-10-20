import type { ReactNode } from "react"

/** EN: Layer ② — split column chrome (focus ring on `.bmxt-picker-column-slot`). */
export function PickerPanelHost({ children }: { children: ReactNode }) {
  return <div className="bmxt-picker-host--split">{children}</div>
}
