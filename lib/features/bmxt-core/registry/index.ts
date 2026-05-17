import type { DispatchJson } from "../types"
import { COMMANDS, COMMAND_RUNNERS, cmdByName } from "./table.gen"

export { buildHelpLines } from "./help"
export { COMMANDS, COMMAND_RUNNERS, cmdByName }

export function resolveCanonical(cmd: string): string | null {
  const k = cmd.toLowerCase()
  for (const c of COMMANDS) {
    if (c.name === k) return c.name
    for (const a of c.aliases) {
      if (a.toLowerCase() === k) return c.name
    }
  }
  return null
}

export function runCommand(canonical: string, args: string[]): DispatchJson {
  const runner = COMMAND_RUNNERS.find((r) => r.name === canonical)
  if (!runner) {
    return {
      ty: "lines",
      lines: [`internal: unhandled command ${canonical}`]
    }
  }
  return runner.run(args)
}

export function allCompletionTokens(): string[] {
  const s = new Set<string>()
  for (const c of COMMANDS) {
    s.add(c.name)
    for (const a of c.aliases) {
      s.add(a)
    }
  }
  return [...s].sort()
}

/** EN: Canonical first-command names only (IME menu / Tab list; no aliases). */
export function canonicalCommandNames(): string[] {
  return COMMANDS.map((c) => c.name).sort((a, b) => a.localeCompare(b))
}
