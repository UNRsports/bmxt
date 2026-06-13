import type { SessionPickerState } from "../side-picker/session/session-pickers"

/** EN: Status toolbar slots shown under the prompt (activation order). */
export type ModeToolbarId =
  | "nav"
  | "translate"
  | "tabs"
  | "search"
  | "dom"
  | "setting"

export const MODE_TOOLBAR_IDS: readonly ModeToolbarId[] = [
  "nav",
  "translate",
  "tabs",
  "search",
  "dom",
  "setting"
]

export function isModeToolbarId(v: unknown): v is ModeToolbarId {
  return typeof v === "string" && (MODE_TOOLBAR_IDS as readonly string[]).includes(v)
}

/** EN: Rebuild toolbar order from open modes when storage has no saved order (legacy). */
export function deriveModeToolbarOrderFromPickers(
  pickers: SessionPickerState | undefined,
  navArmed: boolean
): ModeToolbarId[] {
  const order: ModeToolbarId[] = []
  if (navArmed) {
    order.push("nav")
  }
  if (pickers?.tabs !== null && pickers?.tabs !== undefined) {
    order.push("tabs")
  }
  if (pickers?.search !== null && pickers?.search !== undefined) {
    order.push("search")
  }
  if (pickers?.dom !== null && pickers?.dom !== undefined) {
    order.push("dom")
  }
  if (pickers?.setting !== null && pickers?.setting !== undefined) {
    order.push("setting")
  }
  return order
}

export function activateModeToolbar(
  order: readonly ModeToolbarId[],
  id: ModeToolbarId
): ModeToolbarId[] {
  return [...order.filter((entry) => entry !== id), id]
}

export function deactivateModeToolbar(
  order: readonly ModeToolbarId[],
  id: ModeToolbarId
): ModeToolbarId[] {
  return order.filter((entry) => entry !== id)
}
