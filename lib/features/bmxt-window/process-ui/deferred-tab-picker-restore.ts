import { buildTabPickerRows } from "../../tabs/picker-rows"
import type { TabPickerInteractiveSnapshot } from "../../side-picker/session/tab-picker-state"
import type { TabPickerState } from "../../side-picker/session/tab-picker-state"
import { setSessionPickerSlot } from "../../side-picker/session/session-pickers"
import type { SessionPickersByLeaf } from "../../side-picker/session/session-pickers"
import { resolveTabPickerHiFromAnchor } from "../process-ui-state-storage"

/** EN: Tab picker snapshot awaiting async row rebuild (avoids blocking window open). */
export type DeferredTabPickerRestore = {
  leafId: string
  showUrl: boolean
  variant?: TabPickerState["variant"]
  interactive: TabPickerInteractiveSnapshot
}

function deferToIdle(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestIdleCallback === "function") {
      requestIdleCallback(() => resolve(), { timeout: 120 })
      return
    }
    setTimeout(() => resolve(), 0)
  })
}

/** EN: Fill tab picker rows after the shell is interactive (one leaf at a time). */
export async function hydrateDeferredTabPickerRows(
  restores: readonly DeferredTabPickerRestore[],
  setPickersBySession: (
    update: (prev: SessionPickersByLeaf) => SessionPickersByLeaf
  ) => void
): Promise<void> {
  if (restores.length === 0) {
    return
  }
  await deferToIdle()
  for (const restore of restores) {
    try {
      const rows = await buildTabPickerRows(restore.showUrl)
      const initialHi = resolveTabPickerHiFromAnchor(rows, restore.interactive.anchorTabId)
      const tabs: TabPickerState = {
        rows,
        showUrl: restore.showUrl,
        initialHi,
        variant: restore.variant,
        interactive: restore.interactive
      }
      setPickersBySession((prev) =>
        setSessionPickerSlot(prev, restore.leafId, "tabs", tabs)
      )
    } catch {
      /* skip broken restore */
    }
    await deferToIdle()
  }
}
