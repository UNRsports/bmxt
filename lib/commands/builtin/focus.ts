import type { CommandSpec } from "../types"

export const focusCommand: CommandSpec = {
  name: "focus",
  summary: "show last focused window tracking",
  usage: ["focus"],
  man: [
    "NAME",
    "  focus - show last focused window tracking",
    "",
    "SYNOPSIS",
    "  focus",
    "",
    "NOTE",
    "  Used when tab id is omitted for back / forward."
  ],
  async execute(ctx) {
    return ctx.focusInfo()
  }
}
