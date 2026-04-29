import type { CommandSpec } from "../types"

export const groupsCommand: CommandSpec = {
  name: "groups",
  aliases: ["gls"],
  summary: "list tab groups",
  usage: ["groups", "gls"],
  man: ["NAME", "  groups, gls - list tab groups", "", "SYNOPSIS", "  groups | gls"],
  async execute() {
    const groups = await chrome.tabGroups.query({})
    if (groups.length === 0) {
      return ["(no tab groups)"]
    }
    return groups.map((g) => `${g.id}\twin=${g.windowId}\tcolor=${g.color}\t"${g.title || ""}"\ttabs...`)
  }
}
