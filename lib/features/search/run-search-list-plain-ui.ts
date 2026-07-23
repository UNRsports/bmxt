import type { CommandDispatchDeps } from "../bmxt-window/shell/command-dispatch/types.ts"
import {
  clearPrompt,
  recordCommandHistory
} from "../bmxt-window/shell/command-dispatch/types.ts"
import type { DispatchChromeContext } from "../dispatch"
import { mergeJobIntoDispatchContext, shouldCancelJob } from "../job"
import type { UiLocale } from "../setting/locale.ts"
import { tSearch } from "../setting/i18n/ns/search.ts"
import { tShell } from "../setting/i18n/ns/shell.ts"
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
 * EN: Run plain `search -list` on the BMXt UI thread with busy indicator + Ctrl+C cancel.
 * JA: plain `search -list` を UI で実行し、プロンプト上ビジー表示と Ctrl+C 中断に対応する。
 */
export async function runSearchListPlainOnUi(
  deps: CommandDispatchDeps,
  displayLine: string,
  dispatchLineRaw: string,
  locale: UiLocale
): Promise<void> {
  const dispatchLine = normalizeSearchListDispatchLine(dispatchLineRaw)
  deps.appendCommandToHistory(displayLine.trim())
  clearPrompt(deps)
  recordCommandHistory(deps)

  await deps.appendLogLines([`> ${displayLine}`], "stdout")

  const busyToken = deps.beginCommandBusy(tShell("shell.commandBusy.searching", locale))

  await deps.jobRunner.start(
    "search-list",
    async (job) => {
      const onProgress = async (message: string): Promise<void> => {
        if (shouldCancelJob(job)) {
          return
        }
        await deps.appendLogLines([message], "stdout")
      }

      try {
        const baseCtx = buildSearchDispatchCtx(deps, locale, dispatchLine, onProgress)
        const ctx = mergeJobIntoDispatchContext(baseCtx, job, {
          onSearchPageProgress: onProgress,
          searchPageProgressLabel: searchPageProgressLabel(dispatchLine)
        })
        const result = await fetchSearchListResult({
          dispatchLine,
          locale,
          ctx,
          onProgress,
          onBusyProgress: (progress) => {
            if (shouldCancelJob(job)) {
              return
            }
            deps.updateCommandBusyProgress(busyToken, progress)
          }
        })
        if (shouldCancelJob(job)) {
          return
        }
        const plainLines = formatSearchListPlainLines(result, locale)
        await deps.appendLogLines(plainLines, "stdout")
      } catch (e) {
        if (shouldCancelJob(job)) {
          return
        }
        const message = e instanceof Error ? e.message : String(e)
        await deps.appendLogLines(
          [tSearch("search.list.error.failed", locale, { message })],
          "stderr"
        )
      } finally {
        deps.endCommandBusy(busyToken)
      }
    },
    { meta: { line: dispatchLine } }
  )

  deps.focusPrompt()
}
