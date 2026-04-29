export type CommandContext = {
  clearLog: () => Promise<void>
  listWindows: () => Promise<string[]>
  focusInfo: () => Promise<string[]>
  resolveTabArg: (tabIdStr: string | undefined) => Promise<chrome.tabs.Tab | undefined>
  getHelpLines: () => string[]
  listManTopics: () => string[]
  getManLines: (topicRaw: string) => string[] | null
}

export type CommandSpec = {
  name: string
  aliases?: string[]
  summary: string
  usage: string[]
  man?: string[]
  execute: (ctx: CommandContext, args: string[], raw: string) => Promise<string[]>
}
