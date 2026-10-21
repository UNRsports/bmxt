import type { Dispatch, SetStateAction } from "react"
import type { NavPositionsByTab } from "../../nav"
import { tNav } from "../../setting/i18n/ns/nav"
import type { UiLocale } from "../../setting/locale"
import type { PaneFocusTarget } from "../../side-picker/panel/pane-focus-nav"
import { deactivateModeToolbar, type ModeToolbarId } from "../mode-toolbar-order"

export type CloseNavFromDetailBarDeps = {
  locale: UiLocale
  navArmed: boolean
  teardownNav: () => Promise<void>
  navPositionsRef: React.MutableRefObject<NavPositionsByTab>
  setNavArmed: (armed: boolean) => void
  setNavActive: (active: boolean) => void
  setModeToolbarOrder: Dispatch<SetStateAction<ModeToolbarId[]>>
  activatePaneFocus: (target: PaneFocusTarget) => void
}

/**
 * EN: Disarm nav from the detail bar (one-shot; tears down overlay even when ON).
 * JA: 詳細バーから nav を終了（オーバーレイ ON でも `teardownNav` で片付けて解除）。
 */
export async function closeNavFromDetailBar(deps: CloseNavFromDetailBarDeps): Promise<string> {
  if (!deps.navArmed) {
    return tNav("nav.notArmed", deps.locale)
  }
  await deps.teardownNav()
  deps.navPositionsRef.current = {}
  deps.setNavArmed(false)
  deps.setNavActive(false)
  deps.setModeToolbarOrder((prev) => deactivateModeToolbar(prev, "nav"))
  deps.activatePaneFocus("terminal")
  return tNav("nav.disarmed", deps.locale)
}
