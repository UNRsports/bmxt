import type { CommandSpec } from "../types"

export const newCommand: CommandSpec = {
  name: "new",
  summary: "open a new tab",
  usage: ["new [url]"],
  man: [
    "NAME",
    "  new - open a new tab",
    "",
    "SYNOPSIS",
    "  new [url]",
    "",
    "DESCRIPTION",
    "  If url is omitted, opens the new tab page."
  ],
  async execute(_ctx, args) {
    const url = args[1]
    const tab = await chrome.tabs.create({ url: url || "chrome://newtab" })
    return [`created tab ${tab.id}: ${tab.pendingUrl || tab.url || ""}`]
  }
}
