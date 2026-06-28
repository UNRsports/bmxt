import { useCallback, useRef } from "react"
import { ensureBmxtCore, runDispatch } from "../../bmxt-core"
import { applyChromeEffects } from "../../dispatch"
import type { DomListCapture } from "../../dom/dom-list-capture"
import { captureDomViewportForTab } from "../../dom/dom-viewport-capture"
import {
  isRetryableDomListOutput,
  parseDomListCommandLine,
  type DomListPickerState
} from "../../dom/dom-list-picker-input"
import { resolveDomListTargetTabId as resolveDomListTargetTabIdFromSources } from "../../dom/resolve-dom-list-target-tab"
import { useDomListFollowTab } from "../../dom/use-dom-list-follow-tab"
import { isJobHandleActive, mergeJobIntoDispatchContext, shouldCancelJob, type JobRunner } from "../../job"
import { tDomPrompt } from "../../setting/i18n/ns/dom-prompt"
import { tDom } from "../../setting/i18n/ns/dom"
import { tError } from "../../setting/i18n/ns/error"
import type { UiLocale } from "../../setting/locale"
import { activateModeToolbar } from "../mode-toolbar-order"

export type UseDomListShellOptions = {
  sessionId: string
  uiLocale: UiLocale
  jobRunner: JobRunner
  domListPicker: DomListPickerState | null
  /** EN: Tab-follow refresh while dom picker / detail bar is focused (not from prompt). */
  domListFollowEnabled: boolean
  appendLogLines: (lines: string[]) => void | Promise<void>
  setDomListPicker: (sessionId: string, state: DomListPickerState | null) => void
  setModeToolbarOrder: React.Dispatch<React.SetStateAction<unknown>>
}

/** EN: DOM list picker job lifecycle and tab-follow refresh. */
export function useDomListShell(options: UseDomListShellOptions) {
  const tabsPickerFocusTabIdRef = useRef<number | null>(null)
  const tabPickerOpenRef = useRef(false)

  const resolveDomListTargetTabId = useCallback(async (): Promise<number | undefined> => {
    return resolveDomListTargetTabIdFromSources(
      tabsPickerFocusTabIdRef.current,
      tabPickerOpenRef.current
    )
  }, [])

  const runDomListAndShow = useCallback(
    async (domListLine: string, displayLine: string, announce: boolean): Promise<void> => {
      await options.jobRunner.start(
        "dom-list",
        async (job) => {
          try {
            await ensureBmxtCore()
            const bundle = runDispatch(domListLine, options.uiLocale)
            if (shouldCancelJob(job)) {
              return
            }
            if (bundle.ty === "lines") {
              await options.appendLogLines([`> ${displayLine}`, ...(bundle.lines ?? [])])
              if (shouldCancelJob(job)) {
                return
              }
              if (announce) {
                options.setDomListPicker(options.sessionId, null)
              }
              return
            }
            let domCapture: DomListCapture | undefined
            const ctx = mergeJobIntoDispatchContext(
              {
                enqueueSessionPatch: () => {},
                clearLog: async () => {},
                exitPane: async () => [],
                listWindows: async () => [],
                focusInfo: async () => [],
                resolveTabArg: async () => undefined,
                resolveDomListTargetTabId,
                onDomListCapture: (capture) => {
                  domCapture = capture
                },
                commandSessionId: options.sessionId,
                uiLocale: options.uiLocale
              },
              job
            )
            const linesOut = await applyChromeEffects(ctx, bundle.effects ?? [])
            if (shouldCancelJob(job)) {
              return
            }
            if (isRetryableDomListOutput(linesOut)) {
              if (announce) {
                await options.appendLogLines([
                  `> ${displayLine}`,
                  tDomPrompt("domPrompt.headline", options.uiLocale)
                ])
              }
              if (shouldCancelJob(job)) {
                return
              }
              options.setDomListPicker(options.sessionId, {
                kind: "prompt",
                message: linesOut,
                commandLine: domListLine
              })
              options.setModeToolbarOrder((prev) => activateModeToolbar(prev as never, "dom"))
              return
            }
            if (announce) {
              await options.appendLogLines([`> ${displayLine}`, tDom("dom.listPicker", options.uiLocale)])
            }
            if (shouldCancelJob(job)) {
              return
            }
            const targetTabId = await resolveDomListTargetTabId()
            if (shouldCancelJob(job)) {
              return
            }
            const parsed = parseDomListCommandLine(domListLine)
            options.setDomListPicker(options.sessionId, {
              kind: "lines",
              lines: linesOut,
              commandLine: domListLine,
              targetTabId,
              jumpPaths: domCapture?.jumpPaths ?? linesOut.map(() => null),
              headerLineCount: domCapture?.headerLineCount ?? linesOut.length,
              pickerMode: parsed?.pickerMode ?? "normal",
              flavor: parsed?.flavor ?? "--html",
              showTag: parsed?.showTag ?? false,
              pattern: parsed?.pattern ?? "",
              documentEntries: domCapture?.documentEntries,
              documentTruncated: domCapture?.documentTruncated
            })
            options.setModeToolbarOrder((prev) => activateModeToolbar(prev as never, "dom"))
          } catch (e) {
            if (shouldCancelJob(job)) {
              return
            }
            await options.appendLogLines([
              `> ${displayLine}`,
              tError("error.generic", options.uiLocale, {
                message: e instanceof Error ? e.message : String(e)
              })
            ])
            if (announce) {
              options.setDomListPicker(options.sessionId, null)
            }
          }
        },
        { meta: { line: domListLine } }
      )
    },
    [options, resolveDomListTargetTabId]
  )

  const refreshDomListPicker = useCallback(
    (commandLine: string) => runDomListAndShow(commandLine, commandLine, false),
    [runDomListAndShow]
  )

  const { onTabsPickerFocusTabId: queueDomListFollowRefresh } = useDomListFollowTab({
    domListPicker: options.domListPicker,
    followEnabled: options.domListFollowEnabled,
    resolveTargetTabId: resolveDomListTargetTabId,
    refreshDomList: refreshDomListPicker,
    isDomListJobActive: () => options.jobRunner.isActive("dom-list")
  })

  const onTabsPickerFocusTabId = useCallback(
    (tabId: number | null) => {
      tabsPickerFocusTabIdRef.current = tabId
      queueDomListFollowRefresh(tabId)
    },
    [queueDomListFollowRefresh]
  )

  const syncTabPickerOpen = useCallback((open: boolean) => {
    tabPickerOpenRef.current = open
  }, [])

  const clearTabsPickerFocusTabId = useCallback(() => {
    tabsPickerFocusTabIdRef.current = null
  }, [])

  const refreshDomViewportForPicker = useCallback(
    async (state: Extract<DomListPickerState, { kind: "lines" }>): Promise<DomListCapture | null> => {
      const tabId = state.targetTabId
      if (tabId === undefined) {
        return null
      }
      try {
        const tab = await chrome.tabs.get(tabId)
        const flavor = state.flavor ?? "--html"
        const pattern = state.pattern ?? ""
        const showTag = state.showTag === true
        return await captureDomViewportForTab(tab, flavor, pattern, options.uiLocale, showTag)
      } catch {
        return null
      }
    },
    [options.uiLocale]
  )

  return {
    runDomListAndShow,
    refreshDomListPicker,
    refreshDomViewportForPicker,
    onTabsPickerFocusTabId,
    syncTabPickerOpen,
    clearTabsPickerFocusTabId
  }
}

export { isJobHandleActive }
