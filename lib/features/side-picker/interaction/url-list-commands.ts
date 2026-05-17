export const URL_LIST_PICKER_COMMANDS = ["nohlsearch"] as const

export function filterUrlListCommandCompletions(prefix: string): string[] {
  const p = prefix.trim().toLowerCase()
  if (p === "") {
    return [...URL_LIST_PICKER_COMMANDS]
  }
  return URL_LIST_PICKER_COMMANDS.filter((c) => c.startsWith(p))
}

export const URL_LIST_COMMAND_LISTING_HINT = ":nohlsearch — 検索ハイライトを消す"
