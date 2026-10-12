/**
 * EN: Move the in-page float onto a newly activated tab (picker browse / page-active auto).
 * JA: ピッカー browse／page-active auto で活性化したタブへフロートを引き継ぐ。
 */

import type { SessionPickersByLeaf } from "../side-picker/session/session-pickers.ts"
import { autoSwitchFloatToPopup } from "./float-auto-host-switch.ts"
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
    place: (
      payload: FloatTabHandoffPayload,
      destTabId: number,
      destUrl: string | undefined
    ) => Promise<"shown" | "pending" | "failed">
    hideSource: (tabId: number) => Promise<void>
    /** EN: When place is pending/failed — move UI to popup instead of dropping the prompt. */
    fallbackToPopup?: (payload: FloatTabHandoffPayload) => Promise<void>
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
  if (!deps.isDesiredVisible(fromTabId)) {
    return "noop"
  }

  if (deps.livePickers !== undefined && deps.writePickers) {
    await deps.writePickers(fromTabId, deps.livePickers)
  }

  const payload = await deps.take(fromTabId)
  if (!payload) {
    return "noop"
  }

  const destUrl = await deps.getTabUrl(toTabId)
  const result = await deps.place(payload, toTabId, destUrl)

  if (result === "shown") {
    await deps.hideSource(fromTabId)
    return "shown"
  }

  if (deps.fallbackToPopup) {
    await deps.fallbackToPopup(payload)
    await deps.hideSource(fromTabId)
    return "switchedToPopup"
  }

  await deps.hideSource(fromTabId)
  return result === "pending" ? "pending" : "noop"
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
      place: async (payload, destTabId, destUrl) => {
        const placed = await placeFloatHandoffOnTab(
          payload,
          destTabId,
          destUrl,
          args.showFloat
        )
        if (placed === "pending") {
          return "pending"
        }
        if (placed === "failed") {
          return "failed"
        }
        return "shown"
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
      pickersBySession: args.pickersBySession
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
