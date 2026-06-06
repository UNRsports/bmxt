import { displayTitle, type TabPickerRow } from "./picker-rows"

type WindowPickerRow = Extract<TabPickerRow, { kind: "window" }>

/** EN: Render window header text; tracked window uses live title from Chrome when available. */
export function formatWindowPickerLabel(
  row: WindowPickerRow,
  trackedWindowId: number | undefined,
  trackedWindowTitle: string | null
): string {
  const starred = trackedWindowId !== undefined && row.windowId === trackedWindowId
  const star = starred ? "*" : " "
  const title =
    row.usesActiveTabTitle && starred && trackedWindowTitle !== null
      ? trackedWindowTitle
      : row.windowTitle
  return `${star}[ウィンドウ] ${title}`
}

export { displayTitle }
