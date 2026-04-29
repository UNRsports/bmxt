import type { CommandSpec } from "../types"

export const moveCommand: CommandSpec = {
  name: "move",
  aliases: ["mv"],
  summary: "move a tab to another window",
  usage: ["move <tabId> <windowId> [index]", "mv <tabId> <windowId> [index]"],
  man: [
    "NAME",
    "  move, mv - move a tab to another window",
    "",
    "SYNOPSIS",
    "  move <tabId> <windowId> [index]",
    "  mv <tabId> <windowId> [index]",
    "",
    "DESCRIPTION",
    "  index defaults to end of the target window when omitted."
  ],
  async execute(_ctx, args) {
    const tabId = Number(args[1])
    const windowId = Number(args[2])
    if (!Number.isInteger(tabId) || !Number.isInteger(windowId)) {
      return ["usage: move <tabId> <windowId> [index]", "  index defaults to end of target window"]
    }
    const indexArg = args[3]
    const index = indexArg !== undefined ? Number(indexArg) : undefined
    if (indexArg !== undefined && !Number.isInteger(index)) {
      return ["invalid index"]
    }
    await chrome.tabs.move(tabId, { windowId, index: index ?? -1 })
    return [`moved tab ${tabId} -> window ${windowId}`]
  }
}
