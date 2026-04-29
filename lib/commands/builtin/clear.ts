import type { CommandSpec } from "../types"

export const clearCommand: CommandSpec = {
  name: "clear",
  summary: "clear the on-screen session log",
  usage: ["clear"],
  man: [
    "NAME",
    "  clear - clear the on-screen session log",
    "",
    "SYNOPSIS",
    "  clear",
    "",
    "NOTE",
    "  Does not clear command history (up/down or Ctrl+R)."
  ],
  async execute(ctx) {
    await ctx.clearLog()
    return ["(log cleared)"]
  }
}
