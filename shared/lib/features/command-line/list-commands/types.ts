import type { CommandDispatchDeps } from "../../bmxt-window/shell/command-dispatch/types.ts"
import type { DispatchChromeContext } from "../../dispatch/dispatch-context.ts"
import type { UiLocale } from "../../setting/locale.ts"
import type { ListResult } from "../list-output/types.ts"

/** EN: Built-in `-list` command identifiers (POSIX list producer registry). */
export type ListCommandId = "tabs" | "dom" | "search" | "session" | "setting"

/** EN: Where plain `-list` data is resolved (`service_worker` vs BMXt UI state). */
export type ListCommandRuntime = "service_worker" | "ui"

export type ListCommandMatcher = {
  readonly id: ListCommandId
  readonly command: string
  readonly runtime: ListCommandRuntime
  matchPlain(segment: string): unknown | null
}

export type ListCommandFetchContext = {
  locale: UiLocale
  /** EN: Service Worker / effect path. */
  dispatchCtx?: DispatchChromeContext
  /** EN: BMXt UI path (`session` / `setting` rows, pipe chain, compound). */
  deps?: CommandDispatchDeps
}

/** EN: One registered `-list` producer (parse → ListResult → plain lines). */
export type ListCommandEntry<TMatch = unknown> = {
  readonly id: ListCommandId
  readonly command: string
  readonly runtime: ListCommandRuntime
  matchPlain(segment: string): TMatch | null
  fetchListResult(match: TMatch, ctx: ListCommandFetchContext): Promise<ListResult>
  formatPlainLines(result: ListResult, locale: UiLocale, match: TMatch): string[]
}

export type MatchedListCommand<TMatch = unknown> = {
  entry: ListCommandMatcher
  match: TMatch
}
