import {
  fetchListResultForCommand,
  formatPlainLinesForCommand,
  loadListCommandEntry,
  matchPlainListCommand
} from "./registry.ts"
import type { ListCommandFetchContext, ListCommandId } from "./types.ts"

/** EN: Plain `-list` lines for a registry entry + pre-parsed match (effect / unified runner). */
export async function runPlainListForCommandId<TMatch>(
  id: ListCommandId,
  match: TMatch,
  ctx: ListCommandFetchContext
): Promise<string[]> {
  const entry = await loadListCommandEntry(id)
  const matched = { entry, match }
  const result = await fetchListResultForCommand(matched, ctx)
  return entry.formatPlainLines(result, ctx.locale, match)
}

/** EN: Alias for `runPlainListForCommandId` (UiAction `open_plain_list`). */
export async function runPlainListById(
  id: ListCommandId,
  match: unknown,
  ctx: ListCommandFetchContext
): Promise<string[]> {
  return runPlainListForCommandId(id, match, ctx)
}

/** EN: Alias for `runPlainListForCommandId` (fetch + format plain lines by id). */
export async function fetchAndFormatPlainListById(
  id: ListCommandId,
  match: unknown,
  ctx: ListCommandFetchContext
): Promise<string[]> {
  return runPlainListForCommandId(id, match, ctx)
}

/** EN: Plain `-list` lines for a matched segment, or `null` when not a plain list command. */
export async function tryRunPlainListCommand(
  segment: string,
  ctx: ListCommandFetchContext
): Promise<string[] | null> {
  const matched = matchPlainListCommand(segment)
  if (matched === null) {
    return null
  }
  const result = await fetchListResultForCommand(matched, ctx)
  return formatPlainLinesForCommand(matched, result, ctx.locale)
}
