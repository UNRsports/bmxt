import type { CmdMeta } from "../types"
import { effectsDispatch, linesDispatch } from "../types"

export const CMD: CmdMeta = {
  name: "notes",
  aliases: [],
  usagePrimary: "notes"
}

function usage() {
  return linesDispatch([
    "usage: notes              — release notes for the current extension version",
    "       notes <version>    — notes for that version key (e.g. 0.0.8)",
    "       notes --list | -l  — list versions that have entries"
  ])
}

export function run(args: string[]) {
  if (args.length <= 1) {
    return effectsDispatch([{ kind: "release_notes_current" }])
  }
  if (args.length === 2) {
    const a = args[1]
    if (a === "--list" || a.toLowerCase() === "-l") {
      return effectsDispatch([{ kind: "release_notes_list" }])
    }
    if (a.startsWith("-")) {
      return usage()
    }
    return effectsDispatch([{ kind: "release_notes_version", version: args[1] }])
  }
  return usage()
}
