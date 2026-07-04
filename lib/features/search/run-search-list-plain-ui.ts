import type { CommandDispatchDeps } from "../bmxt-window/shell/command-dispatch/types.ts"
import type { DispatchChromeContext } from "../dispatch"
import type { UiLocale } from "../setting/locale.ts"
import { tSearch } from "../setting/i18n/ns/search.ts"
import {
  fetchSearchListResult,
  formatSearchListPlainLines
} from "./search-list-plain.ts"
import { normalizeSearchListDispatchLine } from "./search-list-picker-parse.ts"
import { searchPageProgressLabel } from "./sources/page-progress.ts"

function buildSearchDispatchCtx(
  deps: CommandDispatchDeps,
  locale: UiLocale,
  dispatchLine: string,
  onProgress: (message: string) => Promise<void>
): DispatchChromeContext {
  return {
    enqueueSessionPatch: () => {},
    clearLog: async () => {},
    exitPane: async () => [],
    listWindows: async () => [],
    focusInfo: async () => [],
    resolveTabArg: async () => undefined,
    commandSessionId: deps.sessionId,
    uiLocale: locale,
    onSearchPageProgress: onProgress,
    searchPageProgressLabel: searchPageProgressLabel(dispatchLine)
  }
}

/**
 * EN: Run plain `search -list` on the BMXt UI thread with live progress lines.
 * JA: plain `search -list` を UI で実行し、進捗行を逐次ログへ出す。
 */
export async function runSearchListPlainOnUi(
  deps: CommandDispatchDeps,
  displayLine: string,
  dispatchLineRaw: string,
  locale: UiLocale
): Promise<void> {
  const dispatchLine = normalizeSearchListDispatchLine(dispatchLineRaw)
  await deps.appendLogLines([`> ${displayLine}`], "stdout")

  const onProgress = async (message: string): Promise<void> => {
    await deps.appendLogLines([message], "stdout")
  }

  try {
    const result = await fetchSearchListResult({
      dispatchLine,
      locale,
      ctx: buildSearchDispatchCtx(deps, locale, dispatchLine, onProgress),
      onProgress
    })
    const plainLines = formatSearchListPlainLines(result, locale)
    await deps.appendLogLines(plainLines, "stdout")
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    await deps.appendLogLines(
      [tSearch("search.list.error.failed", locale, { message })],
      "stderr"
    )
  }
}
