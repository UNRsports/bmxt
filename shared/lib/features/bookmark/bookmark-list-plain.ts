/** EN: Plain-line formatting + fetch for `bookmark -list`. */

import type { UiLocale } from "../setting/locale.ts"
import type { ListResult } from "../command-line/list-output/types.ts"
import { formatListPlainLines } from "../command-line/list-output/format-plain-lines.ts"
import { bookmarkPickerRowsToListResult } from "./bookmark-list-result.ts"
import { buildBookmarkPickerRows } from "./picker-rows.ts"
import type { BookmarkListLineOptions } from "./bookmark-list-parse.ts"

export async function fetchBookmarkListResult(
  match: BookmarkListLineOptions,
  _locale: UiLocale
): Promise<ListResult> {
  if (match.scope.kind !== "local") {
    return {
      schema: "bmxt-list/1",
      command: "bookmark",
      subcommand: "-list",
      records: []
    }
  }
  const rows = await buildBookmarkPickerRows({
    folderId: match.folderId,
    locale: _locale
  })
  return bookmarkPickerRowsToListResult(rows)
}

export function formatBookmarkListPlainLines(result: ListResult, _locale: UiLocale): string[] {
  return formatListPlainLines(result)
}
