import type { TabPickerState } from "../../../side-picker/session/tab-picker-state"
import { openTabPickerEngineForSession } from "../../../tabs/engine"

/** EN: Mount tabs column immediately (empty rows) while row bundle loads asynchronously. */
export function mountTabPickerLoadingColumn(
  sessionId: string,
  showUrl: boolean,
  variant: NonNullable<TabPickerState["variant"]> = "default"
): TabPickerState {
  return openTabPickerEngineForSession(sessionId, {
    rows: [],
    showUrl,
    initialHi: 0,
    variant
  })
}
