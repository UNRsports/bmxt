/** EN: Shared view model for bookmark / history tree pickers (tab-picker row chrome). */

export type TreePickerRowVariant = "window" | "group" | "tab"

export type TreePickerRowView = {
  /** EN: Stable React key / DOM id suffix. */
  domKey: string
  /** EN: CSS variant: window = top header, group = nested header, tab = leaf. */
  variant: TreePickerRowVariant
  /** EN: True for header rows that show a fold glyph. */
  foldable: boolean
  expanded: boolean
  marked: boolean
  label: string
  /** EN: Secondary line (URL / visit meta); null when absent. */
  detail: string | null
  /** EN: Nesting depth for indentation (0 = root). */
  indent: number
}

export type TreePickerActionItem = {
  id: string
  label: string
}

export type TreePickerActionMenu = {
  title: string
  hint: string
  /** EN: Display lines for the rows the action will apply to. */
  targetLabels: string[]
  items: TreePickerActionItem[]
  pickIndex: number
}
