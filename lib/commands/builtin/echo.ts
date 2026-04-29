import type { CommandSpec } from "../types"

export const echoCommand: CommandSpec = {
  name: "echo",
  summary: "print arguments",
  usage: ["echo [text...]"],
  man: ["NAME", "  echo - print arguments", "", "SYNOPSIS", "  echo [text...]"],
  async execute(_ctx, args) {
    return [args.slice(1).join(" ") || "(empty)"]
  }
}
