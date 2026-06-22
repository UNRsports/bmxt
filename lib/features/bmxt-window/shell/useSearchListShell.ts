import { useCallback, useMemo } from "react"
import { ensureBmxtCore, runDispatch } from "../../bmxt-core"
import { applyChromeEffects, type DispatchChromeContext } from "../../dispatch"
import { enrichSearchPickerEntriesFromOpenTabs } from "../../search/enrich-search-entries-from-tabs"
import { openSearchPickerEntry } from "../../search/open-search-picker-entry"
import type { SearchOpenDestinationRow } from "../../search/search-open-destination"
import {
  normalizeSearchListDispatchLine,
  searchListPatternFromLine,
  shouldShowSearchListPatternPlaceholder,
  type SearchListPickerState
} from "../../search/search-list-picker-input"
import { normalizeSearchPattern } from "../../search/search-format"
import { searchPageProgressLabel } from "../../search/sources/page-progress"
import { useBatchedSearchLoadingProgress } from "../../search/use-batched-search-loading-progress"
import { pickerEntriesFromSearchLines } from "../../side-picker/model/from-search-lines"
import type { PickerEntry } from "../../side-picker/model/picker-entry"
import { isJobHandleActive, mergeJobIntoDispatchContext, shouldCancelJob, type JobRunner } from "../../job"
import type { UiCopy } from "../../setting/use-ui-copy"
import type { UiLocale } from "../../setting/locale"
import type { TokenPickerModel } from "../token-picker-panel"
import { activateModeToolbar } from "../mode-toolbar-order"
import { effectsIncludeSearchPage } from "./bmxt-shell-prompt-helpers"

export type UseSearchListShellOptions = {
  sessionId: string
  uiLocale: UiLocale
  uiCopy: UiCopy
  jobRunner: JobRunner
  line: string
  cursorPos: number
  appendLogLines: (lines: string[]) => Promise<void>
  setSearchListPicker: (sessionId: string, state: SearchListPickerState | null) => void
  setModeToolbarOrder: React.Dispatch<React.SetStateAction<unknown>>
  setSubCmdPicker: (state: TokenPickerModel | null) => void
  searchListPickerRef: React.MutableRefObject<SearchListPickerState | null>
}

/** EN: Search list picker job, progress, and entry-open dispatch. */
export function useSearchListShell(options: UseSearchListShellOptions) {
  const {
    lines: searchLoadingProgressLines,
    reset: resetSearchLoadingProgress,
    append: appendSearchLoadingProgress,
    clear: clearSearchLoadingProgress
  } = useBatchedSearchLoadingProgress()

  const showSearchListPatternPlaceholder = useMemo(
    () => shouldShowSearchListPatternPlaceholder(options.line, options.cursorPos),
    [options.line, options.cursorPos]
  )

  const runSearchListSearch = useCallback(
    async (_displayLine: string, searchListLine: string) => {
      options.setSubCmdPicker(null)

      const dispatchLine = normalizeSearchListDispatchLine(searchListLine)
      const progressLabel = searchPageProgressLabel(dispatchLine)
      const initialProgress = [`${progressLabel} — searching…`]
      const searchPattern = normalizeSearchPattern(searchListPatternFromLine(dispatchLine))

      resetSearchLoadingProgress(initialProgress)
      options.setSearchListPicker(options.sessionId, {
        phase: "loading",
        progressLines: [],
        entries: [],
        pattern: searchPattern
      })
      options.setModeToolbarOrder((prev) => activateModeToolbar(prev as never, "search"))

      await options.jobRunner.start(
        "search-list",
        async (job) => {
          try {
            await ensureBmxtCore()
            if (shouldCancelJob(job)) {
              return
            }
            await options.appendLogLines([`> ${dispatchLine}`])
            const bundle = runDispatch(dispatchLine, options.uiLocale)
            if (shouldCancelJob(job)) {
              return
            }
            if (bundle.ty === "lines") {
              clearSearchLoadingProgress()
              options.setSearchListPicker(options.sessionId, null)
              await options.appendLogLines(bundle.lines ?? [])
              return
            }
            const effects = bundle.effects ?? []
            if (effectsIncludeSearchPage(effects) && !shouldCancelJob(job)) {
              appendSearchLoadingProgress(options.uiCopy.t("search.pageScanHint"))
            }
            const ctx = mergeJobIntoDispatchContext(
              {
                clearLog: async () => {},
                exitPane: async () => [],
                listWindows: async () => [],
                focusInfo: async () => [],
                resolveTabArg: async () => undefined,
                commandSessionId: options.sessionId,
                uiLocale: options.uiLocale
              },
              job,
              {
                searchPageProgressLabel: progressLabel,
                onSearchPageProgress: async (message) => {
                  if (!shouldCancelJob(job)) {
                    appendSearchLoadingProgress(message)
                  }
                }
              }
            )
            const linesOut = await applyChromeEffects(ctx, effects)
            if (shouldCancelJob(job)) {
              clearSearchLoadingProgress()
              if (linesOut.length > 0) {
                await options.appendLogLines(linesOut)
              }
              return
            }
            const parsed = pickerEntriesFromSearchLines(linesOut)
            const entries = await enrichSearchPickerEntriesFromOpenTabs(parsed, searchPattern)
            if (shouldCancelJob(job)) {
              clearSearchLoadingProgress()
              return
            }
            clearSearchLoadingProgress()
            const emptyResultLines =
              entries.length === 0 ? linesOut.filter((l) => l.trim().length > 0) : undefined
            options.setSearchListPicker(options.sessionId, {
              phase: "results",
              progressLines: [],
              entries,
              pattern: searchPattern,
              emptyResultLines
            })
          } catch (e) {
            clearSearchLoadingProgress()
            if (!shouldCancelJob(job)) {
              options.setSearchListPicker(options.sessionId, null)
              await options.appendLogLines([
                options.uiCopy.t("error.generic", {
                  message: e instanceof Error ? e.message : String(e)
                })
              ])
            }
          }
        },
        { meta: { line: dispatchLine } }
      )
    },
    [appendSearchLoadingProgress, clearSearchLoadingProgress, options, resetSearchLoadingProgress]
  )

  const cancelSearchPageScan = useCallback(() => {
    const job = options.jobRunner.getActive("search-list")
    if (!isJobHandleActive(job)) {
      return
    }
    options.jobRunner.cancelHandle(job)
    clearSearchLoadingProgress()
    void options.appendLogLines([
      options.uiCopy.t("search.cancelledCtrlC"),
      options.uiCopy.t("search.pageScanCancelled")
    ])
  }, [clearSearchLoadingProgress, options])

  const onOpenSearchPickerEntry = useCallback(
    async (
      entry: PickerEntry,
      matchIndex: number,
      destination?: SearchOpenDestinationRow
    ) => {
      const pattern = options.searchListPickerRef.current?.pattern ?? ""
      const ctx: DispatchChromeContext = {
        clearLog: async () => {},
        exitPane: async () => [],
        listWindows: async () => [],
        focusInfo: async () => [],
        resolveTabArg: async () => undefined,
        commandSessionId: options.sessionId,
        uiLocale: options.uiLocale
      }
      await openSearchPickerEntry(
        entry,
        matchIndex,
        ctx,
        (lines) => options.appendLogLines(lines),
        pattern,
        destination
      )
    },
    [options]
  )

  return {
    searchLoadingProgressLines,
    showSearchListPatternPlaceholder,
    runSearchListSearch,
    cancelSearchPageScan,
    onOpenSearchPickerEntry,
    clearSearchLoadingProgress
  }
}

export { isJobHandleActive }
