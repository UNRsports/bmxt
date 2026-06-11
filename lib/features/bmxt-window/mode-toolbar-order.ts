/** EN: Status toolbar slots shown under the prompt (activation order). */
export type ModeToolbarId =
  | "nav"
  | "translate"
  | "tabs"
  | "search"
  | "dom"
  | "setting"

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
