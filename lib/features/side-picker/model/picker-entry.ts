export type PickerSource = "tab" | "history" | "bookmark" | "page"

export type PickerEntry = {
  id: string
  source: PickerSource
  title: string
  url: string
  tabId?: number
  windowId?: number
  groupId?: number | null
  meta?: Record<string, string>
}

export function entryDisplayLine(entry: PickerEntry): string {
  const title = entry.title.trim() || "(no title)"
  const url = entry.url.trim()
  if (url && !url.startsWith("(no ")) {
    return `[${entry.source}] ${title} — ${url}`
  }
  return `[${entry.source}] ${title}`
}
