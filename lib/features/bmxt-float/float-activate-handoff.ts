/**
 * EN: Move the in-page float onto a newly activated tab (picker browse / page-active auto).
 * JA: ピッカー browse／page-active auto で活性化したタブへフロートを引き継ぐ。
 */

import type { SessionPickersByLeaf } from "../side-picker/session/session-pickers.ts"
import { isScriptablePageUrl } from "../url/is-scriptable-page-url.ts"
import { autoSwitchFloatToPopup } from "./float-auto-host-switch.ts"
import {
  createEmptyFloatBrowseState
} from "./float-browse-state-storage.ts"
import {
  placeFloatHandoffOnTab,
  takeFloatHandoffFromTab,
  type FloatTabHandoffPayload
} from "./float-tab-handoff.ts"
import { saveFloatPickersForTab } from "./float-pickers-by-tab-storage.ts"
import {
  hydrateFloatVisibleTabs,
  isFloatDesiredVisibleOnTab
} from "./float-visible-tabs.ts"
import type { TerminalSessionsStateV1 } from "../bmxt-window/terminal-sessions/types.ts"

function emptySessionsForActivateHandoff(): TerminalSessionsStateV1 {
  const id = `activate_${Date.now()}`
  return {
    v: 2,
    order: [id],
    activeId: id,
    logsById: { [id]: [] },
    namesById: {}
  }
}

export type FloatActivateHandoffResult =
  | "same"
  | "noop"
  | "shown"
  | "pending"
  | "switchedToPopup"

export const BMXT_FLOAT_ACTIVATE_HANDOFF_MESSAGE_TYPE = "BMXT_FLOAT_ACTIVATE_HANDOFF" as const

export type BmxtFloatActivateHandoffMessage = {
  type: typeof BMXT_FLOAT_ACTIVATE_HANDOFF_MESSAGE_TYPE
  fromTabId: number
  toTabId: number
  /** EN: Live picker snapshot from the float UI (written before take if present). */
  pickersBySession?: SessionPickersByLeaf
}

export type BmxtFloatActivateHandoffResponse = {
  ok: true
  result: FloatActivateHandoffResult
} | {
  ok: false
  reason: string
}

export function isBmxtFloatActivateHandoffMessage(
  message: unknown
): message is BmxtFloatActivateHandoffMessage {
  if (!message || typeof message !== "object") {
    return false
  }
  const typed = message as {
    type?: string
    fromTabId?: unknown
    toTabId?: unknown
  }
  if (typed.type !== BMXT_FLOAT_ACTIVATE_HANDOFF_MESSAGE_TYPE) {
    return false
  }
  if (typeof typed.fromTabId !== "number" || !Number.isInteger(typed.fromTabId)) {
    return false
  }
  if (typeof typed.toTabId !== "number" || !Number.isInteger(typed.toTabId)) {
    return false
  }
  return true
}

/**
 * EN: Pure handoff steps (testable). Caller supplies Chrome/storage side effects.
 * JA: 移動元フロートは必ず OFF。移動先で show できなければ popup 退避（二択）。
 */
export async function handoffFloatAcrossTabActivate(
  fromTabId: number,
  toTabId: number,
  deps: {
    hydrateVisible: () => Promise<void>
    isDesiredVisible: (tabId: number) => boolean
    writePickers?: (tabId: number, pickers: SessionPickersByLeaf) => Promise<void>
    livePickers?: SessionPickersByLeaf
    take: (tabId: number) => Promise<FloatTabHandoffPayload | null>
    getTabUrl: (tabId: number) => Promise<string | undefined>
    /** EN: Wake discarded / background dest before inject+show (optional). */
    prepareDest?: (tabId: number) => Promise<void>
    place: (
      payload: FloatTabHandoffPayload,
      destTabId: number,
      destUrl: string | undefined
    ) => Promise<"shown" | "pending" | "failed">
    hideSource: (tabId: number) => Promise<void>
    /**
     * EN: Required for activate path — place pending/failed must open popup (never drop UI).
     * JA: 活性化引き継ぎでは必須。show 不可時は必ず popup（プロンプト消失禁止）。
     */
    fallbackToPopup: (payload: FloatTabHandoffPayload) => Promise<void>
  }
): Promise<FloatActivateHandoffResult> {
  if (fromTabId === toTabId) {
    return "same"
  }
  if (!Number.isInteger(fromTabId) || fromTabId < 0) {
    return "noop"
  }
  if (!Number.isInteger(toTabId) || toTabId < 0) {
    return "noop"
  }

  await deps.hydrateVisible()

  // EN: UI-initiated handoff (livePickers) proceeds even if desired-visible was lost
  //     after SW restart / extension reload; otherwise require the desired flag.
  const uiInitiated = deps.livePickers !== undefined
  if (!uiInitiated && !deps.isDesiredVisible(fromTabId)) {
    return "noop"
  }

  if (deps.livePickers !== undefined && deps.writePickers) {
    await deps.writePickers(fromTabId, deps.livePickers)
  }

  let payload = await deps.take(fromTabId)
  if (!payload) {
    if (!uiInitiated) {
      return "noop"
    }
    // EN: Extension reload may clear session storage while the float UI is still up —
    //     still move to dest float or popup so the prompt never disappears.
    payload = {
      sessions: emptySessionsForActivateHandoff(),
      browse: createEmptyFloatBrowseState(),
      pickersBySession: deps.livePickers ?? {}
    }
  }

  if (deps.prepareDest) {
    await deps.prepareDest(toTabId)
  }

  const destUrl = await deps.getTabUrl(toTabId)
  let result: "shown" | "pending" | "failed"
  try {
    result = await deps.place(payload, toTabId, destUrl)
  } catch {
    result = "failed"
  }

  if (result === "shown") {
    await deps.hideSource(fromTabId)
    return "shown"
  }

  // EN: pending (non-scriptable park) and failed (inject/show) → popup; source always OFF.
  await deps.fallbackToPopup(payload)
  await deps.hideSource(fromTabId)
  return "switchedToPopup"
}

let activateHandoffChain: Promise<void> = Promise.resolve()

export function enqueueFloatActivateHandoff(
  task: () => Promise<void>
): Promise<void> {
  const run = activateHandoffChain.then(task, task)
  activateHandoffChain = run.then(
    () => undefined,
    () => undefined
  )
  return run
}

/**
 * EN: Wake a discarded dest tab so inject/show can run (does not steal focus from source).
 * JA: discarded 先を起こして注入可能にする（移動元フォーカスは維持）。
 */
export async function prepareFloatHandoffDestTab(tabId: number): Promise<void> {
  if (!Number.isInteger(tabId) || tabId < 0) {
    return
  }
  try {
    const tab = await chrome.tabs.get(tabId)
    if (tab.discarded === true) {
      // EN: Reload discarded tabs in place — activate would tear down the source float UI mid-handoff.
      await chrome.tabs.reload(tabId)
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          chrome.tabs.onUpdated.removeListener(onUpdated)
          resolve()
        }, 2500)
        const onUpdated = (
          updatedTabId: number,
          changeInfo: { status?: string }
        ): void => {
          if (updatedTabId !== tabId || changeInfo.status !== "complete") {
            return
          }
          clearTimeout(timeout)
          chrome.tabs.onUpdated.removeListener(onUpdated)
          resolve()
        }
        chrome.tabs.onUpdated.addListener(onUpdated)
      })
    }
  } catch {
    /* tab may be gone */
  }
}

/**
 * EN: SW entry — serialize rapid auto activations; move float from → to (or popup on failure).
 */
export async function runFloatActivateHandoff(args: {
  fromTabId: number
  toTabId: number
  livePickers?: SessionPickersByLeaf
  showFloat: (tabId: number) => Promise<boolean>
  hideFloat: (tabId: number) => Promise<void>
  openOrFocusPopup: () => Promise<void>
  /** EN: Pre-translated log line when falling back to popup. */
  popupFallbackLogLine?: string
}): Promise<FloatActivateHandoffResult> {
  let result: FloatActivateHandoffResult = "noop"
  await enqueueFloatActivateHandoff(async () => {
    result = await handoffFloatAcrossTabActivate(args.fromTabId, args.toTabId, {
      hydrateVisible: hydrateFloatVisibleTabs,
      isDesiredVisible: isFloatDesiredVisibleOnTab,
      writePickers: saveFloatPickersForTab,
      livePickers: args.livePickers,
      take: takeFloatHandoffFromTab,
      getTabUrl: async (tabId) => {
        try {
          const tab = await chrome.tabs.get(tabId)
          return tab.url
        } catch {
          return undefined
        }
      },
      prepareDest: prepareFloatHandoffDestTab,
      place: async (payload, destTabId, destUrl) => {
        // EN: Activate path is binary — never park float-pending on Web Store / chrome://.
        //     (Tab-close handoff may still use placeFloatHandoffOnTab pending.)
        if (!isScriptablePageUrl(destUrl)) {
          return "failed"
        }
        const placed = await placeFloatHandoffOnTab(
          payload,
          destTabId,
          destUrl,
          args.showFloat
        )
        if (placed === "shown") {
          return "shown"
        }
        // EN: pending/dropped/failed → popup (do not leave UI on float-pending only).
        return "failed"
      },
      hideSource: args.hideFloat,
      fallbackToPopup: async (payload) => {
        await autoSwitchFloatToPopup({
          payload,
          hideFloatTabIds: [args.fromTabId, args.toTabId],
          openOrFocusPopup: args.openOrFocusPopup,
          hideFloat: args.hideFloat,
          logLine: args.popupFallbackLogLine
        })
      }
    })
  })
  return result
}

/**
 * EN: Float UI → SW request (after flushPersist). Safe no-op when not float / same tab.
 */
export async function requestFloatActivateHandoff(args: {
  fromTabId: number | null | undefined
  toTabId: number
  pickersBySession?: SessionPickersByLeaf
  flushPersist?: () => Promise<void>
}): Promise<FloatActivateHandoffResult> {
  const fromTabId = args.fromTabId
  if (typeof fromTabId !== "number" || !Number.isInteger(fromTabId) || fromTabId < 0) {
    return "noop"
  }
  if (!Number.isInteger(args.toTabId) || args.toTabId < 0) {
    return "noop"
  }
  if (fromTabId === args.toTabId) {
    return "same"
  }
  if (args.flushPersist) {
    await args.flushPersist()
  }
  try {
    const response = (await chrome.runtime.sendMessage({
      type: BMXT_FLOAT_ACTIVATE_HANDOFF_MESSAGE_TYPE,
      fromTabId,
      toTabId: args.toTabId,
      // EN: Always send a pickers object so SW treats this as UI-initiated.
      pickersBySession: args.pickersBySession ?? {}
    } satisfies BmxtFloatActivateHandoffMessage)) as
      | BmxtFloatActivateHandoffResponse
      | undefined
    if (!response || response.ok !== true) {
      return "noop"
    }
    return response.result
  } catch {
    return "noop"
  }
}
