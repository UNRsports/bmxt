import type { TabPickerRow } from "./picker-rows"

/** `resolvePickerConfirmPlan` / `resolvePickerTarget` に渡す行の形 */
export type TabPickerPlanRow =
  | { kind: "tab"; tabId: number; windowId: number; groupId: number | null }
  | { kind: "window"; windowId: number }
  | { kind: "group"; windowId: number; groupId: number | null }

export function mapVisibleIndicesToPlanRows(
  rows: TabPickerRow[],
  visibleRowIndices: number[]
): TabPickerPlanRow[] {
  return visibleRowIndices
    .map((ri) => rows[ri])
    .filter((r): r is TabPickerRow => r !== undefined)
    .map((r) => {
      if (r.kind === "tab") {
        return {
          kind: "tab" as const,
          tabId: r.tabId,
          windowId: r.windowId,
          groupId: r.groupId
        }
      }
      if (r.kind === "window") {
        return { kind: "window" as const, windowId: r.windowId }
      }
      return { kind: "group" as const, windowId: r.windowId, groupId: r.groupId }
    })
}
