import type { CommandSpec } from "../types"

export const closeCommand: CommandSpec = {
  name: "close",
  aliases: ["c"],
  summary: "close a tab",
  usage: ["close <tabId>", "c <tabId>"],
  man: [
    "NAME",
    "  close, c - close a tab",
    "",
    "SYNOPSIS",
    "  close <tabId>",
    "  c <tabId>"
  ],
  async execute(_ctx, args) {
    const id = Number(args[1])
    if (!Number.isInteger(id)) {
      return ["usage: close <tabId>"]
    }
    await chrome.tabs.remove(id)
    return [`closed tab ${id}`]
  }
}
