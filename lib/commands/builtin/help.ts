import type { CommandSpec } from "../types"

export const helpCommand: CommandSpec = {
  name: "help",
  aliases: ["?"],
  summary: "list commands and BMXt window keys",
  usage: ["help", "?"],
  man: [
    "NAME",
    "  help, ? - list commands and BMXt window keys",
    "",
    "SYNOPSIS",
    "  help",
    "",
    "SEE ALSO",
    "  man(1) for per-command manuals; man url for typed-URL opening"
  ],
  async execute(ctx) {
    return ctx.getHelpLines()
  }
}
