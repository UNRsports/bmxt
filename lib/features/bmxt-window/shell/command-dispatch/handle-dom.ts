import type { CommandDispatchContext, CommandDispatchResult } from "./types"

/**
 * EN: Plain `dom -list` runs via the `-list` registry / background path.
 * Picker UI is `dom -list … | picker` only.
 */
export function tryHandleDomListCommand(_ctx: CommandDispatchContext): CommandDispatchResult {
  return "not_handled"
}
