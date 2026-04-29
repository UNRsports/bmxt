import type { CommandSpec } from "../types"

export const windowsCommand: CommandSpec = {
  name: "windows",
  aliases: ["wins"],
  summary: "list browser windows",
  usage: ["windows", "wins"],
  man: [
    "NAME",
    "  windows, wins - list browser windows",
    "",
    "SYNOPSIS",
    "  windows | wins",
    "",
    "OUTPUT",
    "  One line per window: optional leading * if focused, then the active",
    "  tab title only (no window id or type)."
  ],
  async execute(ctx) {
    return ctx.listWindows()
  }
}
