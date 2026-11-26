import type { ListCommandEntry } from "../command-line/list-commands/types.ts"
import { parseBookmarkListLine, type BookmarkListLineOptions } from "./bookmark-list-parse.ts"
import { fetchBookmarkListResult, formatBookmarkListPlainLines } from "./bookmark-list-plain.ts"

export type BookmarkListMatch = BookmarkListLineOptions

export const bookmarkListCommand: ListCommandEntry<BookmarkListMatch> = {
  id: "bookmark",
  command: "bookmark",
  runtime: "ui",
  matchPlain(segment) {
    return parseBookmarkListLine(segment)
  },
  async fetchListResult(match, ctx) {
    return fetchBookmarkListResult(match, ctx.locale)
  },
  formatPlainLines(result, locale, _match) {
    return formatBookmarkListPlainLines(result, locale)
  }
}
