/**
 * EN: Keep Tab inside the float document (completion-only; never cycle to the host page).
 * JA: フロート内で Tab を完結させ、ページ側へフォーカスが抜けないようにする。
 */

import { useEffect } from "react"

/**
 * EN: Capture-phase Tab guard for `hostKind === "float"`.
 * Prompt handlers already preventDefault; this covers focus on non-prompt nodes.
 */
export function useFloatTabFocusGuard(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) {
      return
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") {
        return
      }
      if (e.defaultPrevented) {
        return
      }
      e.preventDefault()
    }

    window.addEventListener("keydown", onKeyDown, true)
    return () => {
      window.removeEventListener("keydown", onKeyDown, true)
    }
  }, [enabled])
}
