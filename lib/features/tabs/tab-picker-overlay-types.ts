export type BulkSubMode = "move" | "close" | "group" | "newWindow"
export type SelectKind = "window" | "group" | "tab"

export type GroupChoice = {
  id: number
  windowId: number
  label: string
}
