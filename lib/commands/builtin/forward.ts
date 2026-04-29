import type { CommandSpec } from "../types"

export const forwardCommand: CommandSpec = {
  name: "forward",
  aliases: ["fwd"],
  summary: "navigate the tab history forward",
  usage: ["forward [tabId]", "fwd [tabId]"],
  man: [
    "NAME",
    "  forward, fwd - navigate the tab history forward",
    "",
    "SYNOPSIS",
    "  forward [tabId]",
    "  fwd [tabId]"
  ],
  async execute(ctx, args) {
    const tab = await ctx.resolveTabArg(args[1])
    if (!tab?.id) {
      return ["no target tab (set focus window or pass tabId)"]
    }
    await chrome.tabs.goForward(tab.id)
    return [`goForward tab ${tab.id}`]
  }
}
