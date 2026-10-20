import type { ListCommandEntry } from "../command-line/list-commands/types.ts"
import { parseSessionListLine } from "./session-list-parse.ts"
import { buildSessionListResult } from "./session-list-result.ts"
import { formatSessionListPlainLines } from "./session-list-plain.ts"

export type SessionListMatch = Record<string, never>

export const sessionListCommand: ListCommandEntry<SessionListMatch> = {
  id: "session",
  command: "session",
  runtime: "ui",
  matchPlain(segment) {
    const parsed = parseSessionListLine(segment)
    if (parsed === null) {
      return null
    }
    return {}
  },
  async fetchListResult(_match, ctx) {
    if (ctx.deps === undefined) {
      throw new Error("session -list requires UI dispatch deps")
    }
    return buildSessionListResult(ctx.deps.sessionListRows)
  },
  formatPlainLines(result, locale) {
    return formatSessionListPlainLines(result, locale, false)
  }
}
