import type { CommandSpec } from "../types"

export const backCommand: CommandSpec = {
  name: "back",
  aliases: ["b"],
  summary: "navigate the tab history backward",
  usage: ["back [tabId]", "b [tabId]"],
  man: [
    "NAME",
    "  back, b - navigate the tab history backward",
    "",
    "SYNOPSIS",
    "  back [tabId]",
    "",
    "DESCRIPTION",
    "  If tabId is omitted, uses the active tab in the last focused window",
    "  (with fallbacks; see focus)."
  ],
  async execute(ctx, args) {
    const tab = await ctx.resolveTabArg(args[1])
    if (!tab?.id) {
      return ["no target tab (set focus window or pass tabId)"]
    }
    await chrome.tabs.goBack(tab.id)
    return [`goBack tab ${tab.id}`]
  }
}
