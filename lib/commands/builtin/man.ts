import type { CommandSpec } from "../types"

export const manCommand: CommandSpec = {
  name: "man",
  summary: "show manual for a command",
  usage: ["man [topic]"],
  man: [
    "NAME",
    "  man - show manual for a command",
    "",
    "SYNOPSIS",
    "  man [topic]",
    "",
    "DESCRIPTION",
    "  Without topic, prints available manual pages.",
    "  With topic, prints a short reference for that command.",
    "",
    "SEE ALSO",
    "  help"
  ],
  async execute(ctx, args) {
    const topic = args[1]
    if (!topic) {
      return [
        "USAGE: man <topic>",
        "",
        "Available topics:",
        `  ${ctx.listManTopics().join(", ")}`
      ]
    }
    const page = ctx.getManLines(topic)
    if (!page) {
      return [`no manual entry for "${topic}". Try: man`]
    }
    return page
  }
}
