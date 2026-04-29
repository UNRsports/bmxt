import type { CommandSpec } from "../types"

export const activateCommand: CommandSpec = {
  name: "activate",
  aliases: ["a"],
  summary: "focus a tab and its window",
  usage: ["activate <tabId>", "a <tabId>"],
  man: [
    "NAME",
    "  activate, a - focus a tab and its window",
    "",
    "SYNOPSIS",
    "  activate <tabId>",
    "  a <tabId>"
  ],
  async execute(_ctx, args) {
    const id = Number(args[1])
    if (!Number.isInteger(id)) {
      return ["usage: activate <tabId>"]
    }
    const tab = await chrome.tabs.get(id)
    await chrome.tabs.update(id, { active: true })
    await chrome.windows.update(tab.windowId, { focused: true })
    return [`activated tab ${id} (window ${tab.windowId})`]
  }
}
